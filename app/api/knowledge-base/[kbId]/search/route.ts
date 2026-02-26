// app/api/knowledge-base/[kbId]/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getKBIndex } from "@/lib/pinecone/client";
import { generateSingleEmbedding } from "@/lib/pinecone/embeddings";

type SearchMode = "keyword" | "semantic" | "hybrid";

interface SearchBody {
  query: string;
  mode?: SearchMode;
  folderId?: string;
  fileTypes?: string[];
  tags?: string[];
  limit?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    // 1. Auth check (same pattern as other KB routes)
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    if (!user?.teamId) {
      return NextResponse.json(
        { error: "No team found" },
        { status: 404 }
      );
    }

    const { kbId } = await params;

    // 2. Verify KB belongs to user's team
    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: kbId, teamId: user.teamId },
      select: { id: true },
    });

    if (!kb) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      );
    }

    // 3. Parse body, validate query is non-empty
    const body: SearchBody = await request.json();
    const { query, folderId, fileTypes, tags } = body;
    const mode: SearchMode = body.mode || "hybrid";
    const limit = Math.min(Math.max(body.limit || 20, 1), 100);

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { error: "query is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const results: any[] = [];
    const seenIds = new Set<string>();

    // Tier 1: Keyword search (when mode is "keyword" or "hybrid")
    if (mode === "keyword" || mode === "hybrid") {
      const where: any = {
        knowledgeBaseId: kbId,
        isArchived: false,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
          { tags: { hasSome: query.split(" ") } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      };

      if (folderId) where.folderId = folderId;
      if (fileTypes?.length) where.fileType = { in: fileTypes };
      if (tags?.length) where.tags = { hasSome: tags };

      const ftsResults = await prisma.kBDocument.findMany({
        where,
        include: {
          uploadedBy: { select: { id: true, name: true } },
          folder: { select: { id: true, name: true } },
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
      });

      for (const doc of ftsResults) {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          results.push({ ...doc, searchScore: 0.8, searchType: "keyword" });
        }
      }
    }

    // Tier 2: Semantic search via Pinecone (when mode is "semantic" or "hybrid")
    if (mode === "semantic" || mode === "hybrid") {
      try {
        const queryEmbedding = await generateSingleEmbedding(query);
        const index = getKBIndex();

        const filter: any = { teamId: user.teamId };
        if (folderId) filter.folderId = folderId;
        if (fileTypes?.length) filter.fileType = { $in: fileTypes };

        const pineconeResults = await index.namespace(user.teamId).query({
          vector: queryEmbedding,
          topK: limit,
          filter,
          includeMetadata: true,
        });

        if (pineconeResults.matches?.length) {
          const documentIds = pineconeResults.matches
            .map((m) => m.metadata?.documentId as string)
            .filter(Boolean)
            .filter((id) => !seenIds.has(id));

          if (documentIds.length > 0) {
            const semanticDocs = await prisma.kBDocument.findMany({
              where: { id: { in: documentIds }, isArchived: false },
              include: {
                uploadedBy: { select: { id: true, name: true } },
                folder: { select: { id: true, name: true } },
              },
            });

            const scoreMap = new Map(
              pineconeResults.matches.map((m) => [
                m.metadata?.documentId,
                m.score,
              ])
            );

            for (const doc of semanticDocs) {
              if (!seenIds.has(doc.id)) {
                seenIds.add(doc.id);
                results.push({
                  ...doc,
                  searchScore: scoreMap.get(doc.id) || 0.5,
                  searchType: "semantic",
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("[KB Search] Pinecone error:", error);
        // Degrade gracefully - FTS results still returned
      }
    }

    // Sort by score descending, return limited results
    results.sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0));

    return NextResponse.json({
      results: results.slice(0, limit),
      total: results.length,
      mode,
    });
  } catch (error) {
    console.error("[KB Search] Error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
