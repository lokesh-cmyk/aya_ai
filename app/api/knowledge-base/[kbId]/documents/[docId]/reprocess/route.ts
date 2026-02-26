// app/api/knowledge-base/[kbId]/documents/[docId]/reprocess/route.ts
// Synchronously process a single document: extract text + upsert to Pinecone.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";
import { getKBIndex } from "@/lib/pinecone/client";
import { chunkText } from "@/lib/pinecone/embeddings";
import { KBFileType } from "@/app/generated/prisma/enums";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; docId: string }> }
) {
  try {
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
      return NextResponse.json({ error: "No team found" }, { status: 404 });
    }

    const teamId = user.teamId;
    const { kbId, docId } = await params;

    // Fetch the document
    const doc = await prisma.kBDocument.findFirst({
      where: {
        id: docId,
        knowledgeBaseId: kbId,
        knowledgeBase: { teamId },
        isArchived: false,
      },
      select: {
        id: true,
        storageKey: true,
        fileType: true,
        title: true,
        tags: true,
        folderId: true,
        knowledgeBaseId: true,
        content: true,
      },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Step 1: Extract content if not already available
    let content = doc.content || "";

    if (!content.trim()) {
      const storage = getStorageProvider();

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
          const parser = new PDFParse({ data: new Uint8Array(buffer) });
          const result = await parser.getText();
          await parser.destroy();
          content = result.text;
          break;
        }
        default:
          return NextResponse.json({
            success: false,
            error: `Cannot extract text from ${doc.fileType} files`,
          });
      }
    }

    if (!content.trim()) {
      return NextResponse.json({
        success: false,
        error: "No text content could be extracted",
      });
    }

    // Step 2: Save content to DB
    await prisma.kBDocument.update({
      where: { id: doc.id },
      data: { content },
    });

    // Step 3: Chunk and upsert to Pinecone (integrated embedding)
    const chunks = chunkText(content);
    const index = getKBIndex();

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

    return NextResponse.json({
      success: true,
      message: `Document indexed with ${chunks.length} chunks`,
      chunks: chunks.length,
    });
  } catch (error: any) {
    console.error("[KB Reprocess] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process document" },
      { status: 500 }
    );
  }
}
