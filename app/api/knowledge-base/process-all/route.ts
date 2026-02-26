// app/api/knowledge-base/process-all/route.ts
// Batch process all unindexed KB documents: extract text + upsert to Pinecone.
// Bypasses Inngest — runs synchronously for immediate results.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";
import { getKBIndex } from "@/lib/pinecone/client";
import { chunkText } from "@/lib/pinecone/embeddings";
import { KBFileType } from "@/app/generated/prisma/enums";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });
    if (!user?.teamId) {
      return NextResponse.json({ error: "No team" }, { status: 404 });
    }

    const teamId = user.teamId;

    // Find all unindexed documents (no pineconeId)
    const documents = await prisma.kBDocument.findMany({
      where: {
        knowledgeBase: { teamId },
        isArchived: false,
        pineconeId: null,
      },
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

    if (!documents.length) {
      return NextResponse.json({
        success: true,
        message: "No unindexed documents found",
        processed: 0,
      });
    }

    const results: Array<{
      id: string;
      title: string;
      status: "indexed" | "skipped" | "error";
      error?: string;
    }> = [];

    const storage = getStorageProvider();
    const index = getKBIndex();

    for (const doc of documents) {
      try {
        // Step 1: Extract content if not already available
        let content = doc.content || "";

        if (!content.trim()) {
          switch (doc.fileType) {
            case KBFileType.TEXT:
            case KBFileType.MARKDOWN: {
              const buffer = await storage.download(doc.storageKey);
              content = buffer.toString("utf-8");
              break;
            }
            case KBFileType.PDF: {
              const buffer = await storage.download(doc.storageKey);
              const { PDFParse } = await import("pdf-parse");
              const parser = new PDFParse({
                data: new Uint8Array(buffer),
              });
              const result = await parser.getText();
              await parser.destroy();
              content = result.text;
              break;
            }
            default:
              // Skip unsupported types
              results.push({
                id: doc.id,
                title: doc.title,
                status: "skipped",
                error: `Unsupported file type: ${doc.fileType}`,
              });
              continue;
          }
        }

        if (!content.trim()) {
          results.push({
            id: doc.id,
            title: doc.title,
            status: "skipped",
            error: "No text content extracted",
          });
          continue;
        }

        // Step 2: Save content to DB
        await prisma.kBDocument.update({
          where: { id: doc.id },
          data: { content },
        });

        // Step 3: Chunk and upsert to Pinecone (integrated embedding)
        const chunks = chunkText(content);
        const records = chunks.map((chunk) => ({
          _id: `${doc.id}_chunk_${chunk.index}`,
          text: chunk.text.slice(0, 1000),
          documentId: doc.id,
          teamId,
          folderId: doc.folderId || "",
          knowledgeBaseId: doc.knowledgeBaseId,
          fileType: doc.fileType,
          title: doc.title,
          tags: (doc.tags || []).join(","),
          chunkIndex: String(chunk.index),
        }));

        await index.namespace(teamId).upsertRecords({ records });

        // Step 4: Mark as indexed
        await prisma.kBDocument.update({
          where: { id: doc.id },
          data: { pineconeId: `${doc.id}_chunk_0` },
        });

        results.push({ id: doc.id, title: doc.title, status: "indexed" });
      } catch (error: any) {
        console.error(
          `[process-all] Failed to process ${doc.id}:`,
          error.message
        );
        results.push({
          id: doc.id,
          title: doc.title,
          status: "error",
          error: error.message,
        });
      }
    }

    const indexed = results.filter((r) => r.status === "indexed").length;
    return NextResponse.json({
      success: true,
      total: documents.length,
      indexed,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    });
  } catch (error: any) {
    console.error("[process-all] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process documents" },
      { status: 500 }
    );
  }
}
