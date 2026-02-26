// app/api/knowledge-base/[kbId]/documents/[docId]/reprocess/route.ts
// Manually trigger re-processing for a document (text extraction + embeddings)

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";

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

    const { kbId, docId } = await params;

    // Verify KB + document belong to team
    const document = await prisma.kBDocument.findFirst({
      where: {
        id: docId,
        knowledgeBaseId: kbId,
        knowledgeBase: { teamId: user.teamId },
        isArchived: false,
      },
      select: { id: true, storageKey: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    await inngest.send({
      name: "kb/document.process",
      data: {
        documentId: docId,
        teamId: user.teamId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Document processing triggered",
    });
  } catch (error) {
    console.error("[KB Reprocess] Error:", error);
    return NextResponse.json(
      { error: "Failed to trigger reprocessing" },
      { status: 500 }
    );
  }
}
