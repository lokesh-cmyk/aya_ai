/* eslint-disable @typescript-eslint/no-explicit-any */
import { tool } from "ai";
import { z } from "zod";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export function isWebSearchConfigured(): boolean {
  return !!TAVILY_API_KEY;
}

export function getWebSearchTool() {
  if (!TAVILY_API_KEY) return {};

  return {
    web_search: tool({
      description:
        "Search the web for current information. Use this when the user asks about recent events, news, facts, or anything you don't have knowledge about. Returns titles, URLs, and content snippets.",
      parameters: z.object({
        query: z.string().describe("The search query"),
        max_results: z
          .number()
          .min(1)
          .max(10)
          .default(5)
          .describe("Maximum number of results to return (default 5)"),
      }),
      execute: async ({ query, max_results }: { query: string; max_results: number }) => {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: TAVILY_API_KEY,
            query,
            max_results: max_results ?? 5,
            include_answer: true,
          }),
        });

        if (!response.ok) {
          return { error: "Search failed. Please try again." };
        }

        const data = await response.json();

        return {
          answer: data.answer || null,
          results: (data.results || []).map(
            (r: { title: string; url: string; content: string }) => ({
              title: r.title,
              url: r.url,
              snippet: r.content?.substring(0, 300) || "",
            })
          ),
        };
      },
    }),
  };
}
