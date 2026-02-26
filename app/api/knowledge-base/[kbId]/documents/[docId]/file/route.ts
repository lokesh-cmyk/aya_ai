// app/api/knowledge-base/[kbId]/documents/[docId]/file/route.ts
// Proxy endpoint to serve KB document files through our API.
// Avoids CORS/SSL issues with direct Supabase signed URLs.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";

export const maxDuration = 30;

export async function GET(
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

    // Verify KB + document belong to user's team
    const document = await prisma.kBDocument.findFirst({
      where: {
        id: docId,
        knowledgeBaseId: kbId,
        knowledgeBase: { teamId: user.teamId },
        isArchived: false,
      },
      select: { storageKey: true, mimeType: true, title: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Download from storage provider (works server-side, no CORS/SSL issues)
    const storage = getStorageProvider();
    const buffer = await storage.download(document.storageKey);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.mimeType || "application/octet-stream",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `inline; filename="${encodeURIComponent(document.title)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[KB File Proxy] Error:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}
