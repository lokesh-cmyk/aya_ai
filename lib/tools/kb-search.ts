import { tool } from "ai";
import { z } from "zod";
import { getKBIndex } from "@/lib/pinecone/client";
import { prisma } from "@/lib/prisma";

export function isKBSearchConfigured(): boolean {
  return !!process.env.PINECONE_API_KEY;
}

/**
 * Returns the KB search tool scoped to a specific team.
 * Uses Pinecone's integrated embedding (llama-text-embed-v2) for search —
 * no manual embedding generation needed.
 */
export function getKBSearchTool(teamId: string) {
  if (!teamId || !process.env.PINECONE_API_KEY) return {};

  return {
    kb_search: tool({
      description:
        "Search the team's Knowledge Base for documents, files, meeting transcripts, and information. Use this when the user asks about internal documents, project files, meeting notes, policies, procedures, or any information that might be stored in the team's knowledge base. Returns relevant document excerpts with titles and sources.",
      inputSchema: z.object({
        query: z
          .string()
          .describe("The search query — what the user wants to find"),
        max_results: z
          .number()
          .min(1)
          .max(10)
          .default(5)
          .describe("Maximum number of results to return (default 5)"),
      }),
      execute: async ({ query, max_results }) => {
        try {
          const index = getKBIndex();

          // Search using Pinecone's integrated embedding (auto-embeds the query text)
          const searchResults = await index.namespace(teamId).searchRecords({
            query: {
              topK: max_results ?? 5,
              inputs: { text: query },
            },
            fields: [
              "text",
              "documentId",
              "title",
              "fileType",
              "folderId",
              "knowledgeBaseId",
              "tags",
              "chunkIndex",
            ],
          });

          const hits = searchResults.result?.hits || [];

          if (!hits.length) {
            // Fall back to keyword search in PostgreSQL
            const keywordResults = await prisma.kBDocument.findMany({
              where: {
                knowledgeBase: { teamId },
                isArchived: false,
                OR: [
                  { title: { contains: query, mode: "insensitive" } },
                  { content: { contains: query, mode: "insensitive" } },
                  { description: { contains: query, mode: "insensitive" } },
                  { tags: { hasSome: query.split(" ").filter(Boolean) } },
                ],
              },
              select: {
                id: true,
                title: true,
                content: true,
                fileType: true,
                source: true,
                tags: true,
                folder: { select: { name: true } },
                knowledgeBaseId: true,
              },
              take: max_results ?? 5,
              orderBy: { updatedAt: "desc" },
            });

            if (!keywordResults.length) {
              return {
                results: [],
                total: 0,
                message: "No matching documents found in the knowledge base.",
              };
            }

            return {
              results: keywordResults.map((doc) => ({
                documentId: doc.id,
                title: doc.title,
                excerpt: doc.content?.substring(0, 500) || "",
                fileType: doc.fileType,
                source: doc.source,
                folder: doc.folder?.name || "Root",
                tags: doc.tags,
                url: `/knowledge-base/${doc.knowledgeBaseId}/documents/${doc.id}`,
              })),
              total: keywordResults.length,
            };
          }

          // Extract unique document IDs from search hits
          type HitFields = Record<string, unknown>;
          const documentIds = [
            ...new Set(
              hits
                .map((h) => (h.fields as HitFields)?.documentId as string)
                .filter(Boolean)
            ),
          ];

          // Fetch full document details from Prisma
          const documents = await prisma.kBDocument.findMany({
            where: {
              id: { in: documentIds },
              isArchived: false,
              knowledgeBase: { teamId },
            },
            select: {
              id: true,
              title: true,
              content: true,
              fileType: true,
              source: true,
              tags: true,
              folder: { select: { name: true } },
              knowledgeBaseId: true,
            },
          });

          // Build results combining Pinecone hits with DB metadata
          const docMap = new Map(documents.map((d) => [d.id, d]));
          const results = hits
            .filter((h) => docMap.has((h.fields as HitFields)?.documentId as string))
            .map((hit) => {
              const fields = hit.fields as HitFields;
              const doc = docMap.get(fields?.documentId as string)!;
              const chunkText = (fields?.text as string) || "";

              return {
                documentId: doc.id,
                title: doc.title,
                excerpt: chunkText || doc.content?.substring(0, 500) || "",
                relevanceScore: hit._score || 0,
                fileType: doc.fileType,
                source: doc.source,
                folder: doc.folder?.name || "Root",
                tags: doc.tags,
                url: `/knowledge-base/${doc.knowledgeBaseId}/documents/${doc.id}`,
              };
            });

          // Deduplicate by documentId (keep highest score)
          const seen = new Set<string>();
          const deduped = results.filter((r) => {
            if (seen.has(r.documentId)) return false;
            seen.add(r.documentId);
            return true;
          });

          return {
            results: deduped,
            total: deduped.length,
          };
        } catch (error) {
          console.error("[kb_search] Error:", error);
          return {
            results: [],
            total: 0,
            error: "Failed to search knowledge base. Please try again.",
          };
        }
      },
    }),
  };
}
