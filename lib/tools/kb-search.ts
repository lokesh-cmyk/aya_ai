import { tool } from "ai";
import { z } from "zod";
import { getKBIndex } from "@/lib/pinecone/client";
import { generateSingleEmbedding } from "@/lib/pinecone/embeddings";
import { prisma } from "@/lib/prisma";

export function isKBSearchConfigured(): boolean {
  return !!process.env.PINECONE_API_KEY;
}

/**
 * Returns the KB search tool scoped to a specific team.
 * The teamId parameter ensures strict data isolation — only documents
 * belonging to the user's team are ever returned.
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
          // Generate embedding for the search query
          const queryEmbedding = await generateSingleEmbedding(query);
          const index = getKBIndex();

          // Query Pinecone — namespaced by teamId for strict isolation
          const pineconeResults = await index.namespace(teamId).query({
            vector: queryEmbedding,
            topK: max_results ?? 5,
            filter: { teamId },
            includeMetadata: true,
          });

          if (!pineconeResults.matches?.length) {
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

          // Get unique document IDs from Pinecone results
          const documentIds = [
            ...new Set(
              pineconeResults.matches
                .map((m) => m.metadata?.documentId as string)
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

          // Build results with Pinecone chunk text for context
          const docMap = new Map(documents.map((d) => [d.id, d]));
          const results = pineconeResults.matches
            .filter((m) => docMap.has(m.metadata?.documentId as string))
            .map((match) => {
              const doc = docMap.get(match.metadata?.documentId as string)!;
              const chunkText = (match.metadata?.text as string) || "";

              return {
                documentId: doc.id,
                title: doc.title,
                excerpt: chunkText || doc.content?.substring(0, 500) || "",
                relevanceScore: match.score || 0,
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
