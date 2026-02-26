"use client";

import { useState, useCallback } from "react";
import { Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useKBSearch } from "@/hooks/useKnowledgeBase";
import { KBDocumentGrid } from "./KBDocumentGrid";
import { cn } from "@/lib/utils";

interface KBSearchBarProps {
  kbId: string;
  basePath: string;
}

type SearchMode = "hybrid" | "keyword" | "semantic";

export function KBSearchBar({ kbId, basePath }: KBSearchBarProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("hybrid");
  const [showResults, setShowResults] = useState(false);
  const searchMutation = useKBSearch(kbId);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    searchMutation.mutate({ query: query.trim(), mode });
    setShowResults(true);
  }, [query, mode, searchMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") {
      setShowResults(false);
      setQuery("");
    }
  };

  const clearSearch = () => {
    setQuery("");
    setShowResults(false);
    searchMutation.reset();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documents..."
            className="pl-10 pr-8"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
          {(["hybrid", "keyword", "semantic"] as SearchMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-3 py-2 text-xs font-medium capitalize transition-colors",
                mode === m ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <Button onClick={handleSearch} disabled={!query.trim() || searchMutation.isPending} size="sm">
          {searchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {showResults && searchMutation.data && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">
              {searchMutation.data.total} result{searchMutation.data.total !== 1 ? "s" : ""} for &quot;{query}&quot;
            </p>
            <button onClick={clearSearch} className="text-xs text-gray-400 hover:text-gray-600">
              Clear
            </button>
          </div>
          <KBDocumentGrid
            kbId={kbId}
            documents={searchMutation.data.results}
            basePath={basePath}
          />
        </div>
      )}
    </div>
  );
}
