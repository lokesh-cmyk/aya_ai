import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { getStorageProvider, buildStorageKey } from "@/lib/storage";
import { getKBIndex } from "@/lib/pinecone/client";
import { chunkText } from "@/lib/pinecone/embeddings";
import {
  KBFileType,
  KBDocumentSource,
  KBFolderType,
} from "@/app/generated/prisma/enums";

/**
 * Process an uploaded KB document:
 * 1. Fetch document metadata from DB
 * 2. Extract text content from the file
 * 3. Save extracted content back to DB
 * 4. Upsert text records to Pinecone (auto-embedded by llama-text-embed-v2)
 */
export const processKBDocument = inngest.createFunction(
  { id: "process-kb-document" },
  { event: "kb/document.process" },
  async ({ event, step }) => {
    const { documentId, teamId } = event.data;

    console.log(
      `[kb-process] Processing document ${documentId} for team ${teamId}`
    );

    // Step 1: Fetch document metadata
    const document = await step.run("fetch-document", async () => {
      return await prisma.kBDocument.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          storageKey: true,
          fileType: true,
          mimeType: true,
          title: true,
          tags: true,
          folderId: true,
          knowledgeBaseId: true,
          content: true,
        },
      });
    });

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Step 2: Extract text content from the file
    // For TEXT/MARKDOWN/TRANSCRIPT, content may already be saved in DB during upload
    const content = await step.run("extract-text", async () => {
      // If content is already available in DB (saved during upload), use it directly
      if (document.content && document.content.trim().length > 0) {
        console.log(
          `[kb-process] Using pre-extracted content for document ${documentId}`
        );
        return document.content;
      }

      switch (document.fileType) {
        case KBFileType.TEXT:
        case KBFileType.MARKDOWN: {
          const storage = getStorageProvider();
          const buffer = await storage.download(document.storageKey);
          return buffer.toString("utf-8");
        }

        case KBFileType.TRANSCRIPT: {
          return "";
        }

        case KBFileType.PDF: {
          const storage = getStorageProvider();
          const buffer = await storage.download(document.storageKey);
          const { PDFParse } = await import("pdf-parse");
          const parser = new PDFParse({ data: new Uint8Array(buffer) });
          const result = await parser.getText();
          await parser.destroy();
          return result.text;
        }

        case KBFileType.IMAGE:
        case KBFileType.AUDIO:
          // OCR / Whisper can be added later
          return "";

        default:
          return "";
      }
    });

    if (!content || content.trim().length === 0) {
      console.log(
        `[kb-process] No text content extracted for document ${documentId} (fileType: ${document.fileType})`
      );
      return { success: true, documentId, embedded: false };
    }

    // Step 3: Save extracted content back to DB
    await step.run("save-content", async () => {
      await prisma.kBDocument.update({
        where: { id: documentId },
        data: { content },
      });
    });

    // Step 4: Upsert text records to Pinecone
    // Pinecone's integrated embedding (llama-text-embed-v2) auto-generates vectors
    await step.run("upsert-to-pinecone", async () => {
      const chunks = chunkText(content);
      const index = getKBIndex();

      // Build integrated records — Pinecone auto-embeds the "text" field
      const records = chunks.map((chunk) => ({
        _id: `${documentId}_chunk_${chunk.index}`,
        text: chunk.text.slice(0, 1000),
        documentId,
        teamId,
        folderId: document.folderId || "",
        knowledgeBaseId: document.knowledgeBaseId,
        fileType: document.fileType,
        title: document.title,
        tags: (document.tags || []).join(","),
        chunkIndex: String(chunk.index),
      }));

      await index.namespace(teamId).upsertRecords({ records });

      await prisma.kBDocument.update({
        where: { id: documentId },
        data: { pineconeId: `${documentId}_chunk_0` },
      });
    });

    console.log(
      `[kb-process] Document ${documentId} processed and embedded successfully`
    );

    return { success: true, documentId, embedded: true };
  }
);

/**
 * Auto-save a meeting transcript to the project's Knowledge Base.
 * Triggered after a meeting transcript is ready and insights are generated.
 *
 * 1. Find KB config with auto-save enabled for the team
 * 2. Create a KBDocument with source MEETING_TRANSCRIPT
 * 3. Trigger embedding generation via kb/document.process
 */
export const saveMeetingTranscriptToKB = inngest.createFunction(
  { id: "save-meeting-transcript-to-kb" },
  { event: "kb/meeting-transcript.save" },
  async ({ event, step }) => {
    const { meetingId, teamId, transcriptText, meetingTitle } = event.data;

    console.log(
      `[kb-transcript] Saving transcript for meeting ${meetingId} to KB`
    );

    // Step 1: Find team's KB + project settings with auto-save enabled
    const kbConfig = await step.run("find-kb-config", async () => {
      const settings = await prisma.kBProjectSettings.findFirst({
        where: {
          autoSaveTranscripts: true,
          knowledgeBase: {
            teamId,
          },
        },
        include: {
          knowledgeBase: true,
          transcriptFolder: true,
        },
      });

      return settings;
    });

    if (!kbConfig) {
      console.log(
        `[kb-transcript] No KB auto-save config found for team ${teamId} — skipping`
      );
      return { success: false, reason: "no_kb_config" };
    }

    // Step 2: Create KBDocument with source MEETING_TRANSCRIPT
    const document = await step.run(
      "create-transcript-document",
      async () => {
        const knowledgeBaseId = kbConfig.knowledgeBaseId;

        // Find or create "Meeting Transcripts" folder
        let folderId = kbConfig.transcriptFolderId;

        if (!folderId) {
          const folder = await prisma.kBFolder.create({
            data: {
              knowledgeBaseId,
              name: "Meeting Transcripts",
              type: KBFolderType.MEETING_TRANSCRIPTS,
              createdById: kbConfig.knowledgeBase.createdById,
            },
          });
          folderId = folder.id;

          await prisma.kBProjectSettings.update({
            where: { id: kbConfig.id },
            data: { transcriptFolderId: folderId },
          });
        }

        // Upload transcript text to storage
        const storage = getStorageProvider();
        const filename = `${meetingTitle.replace(/[^a-zA-Z0-9-_ ]/g, "")}_transcript.txt`;
        const buffer = Buffer.from(transcriptText, "utf-8");
        const storageKey = buildStorageKey(
          teamId,
          knowledgeBaseId,
          folderId,
          meetingId,
          filename
        );

        const uploadResult = await storage.upload(
          storageKey,
          buffer,
          "text/plain"
        );

        const doc = await prisma.kBDocument.create({
          data: {
            folderId,
            knowledgeBaseId,
            title: `${meetingTitle} — Transcript`,
            fileType: KBFileType.TRANSCRIPT,
            mimeType: "text/plain",
            fileSize: buffer.length,
            fileUrl: uploadResult.url,
            storageKey: uploadResult.key,
            content: transcriptText,
            source: KBDocumentSource.MEETING_TRANSCRIPT,
            sourceReferenceId: meetingId,
            tags: ["meeting", "transcript", "auto-saved"],
            uploadedById: kbConfig.knowledgeBase.createdById,
          },
        });

        return doc;
      }
    );

    // Step 3: Trigger embedding generation
    await step.run("trigger-embedding", async () => {
      await inngest.send({
        name: "kb/document.process",
        data: {
          documentId: document.id,
          teamId,
        },
      });
    });

    console.log(
      `[kb-transcript] Transcript document ${document.id} created for meeting ${meetingId}`
    );

    return { success: true, documentId: document.id, meetingId };
  }
);
