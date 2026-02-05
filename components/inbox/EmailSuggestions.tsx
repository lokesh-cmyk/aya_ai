import { Sparkles, Loader2, RefreshCw, ArrowRight } from 'lucide-react';

interface EmailSuggestionsProps {
  suggestions: string[];
  isLoading: boolean;
  error: string | null;
  onSelectSuggestion: (suggestion: string) => void;
  onRefresh: () => void;
}

export function EmailSuggestions({
  suggestions,
  isLoading,
  error,
  onSelectSuggestion,
  onRefresh,
}: EmailSuggestionsProps) {
  if (error) {
    return (
      <div className="backdrop-blur-xl bg-red-500/5 border border-red-200/50 rounded-2xl p-4">
        <p className="text-sm text-red-600/90">{error}</p>
        <button
          onClick={onRefresh}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-600
                     hover:text-red-700 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Try again
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="backdrop-blur-xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10
                      border border-violet-200/30 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-violet-400/20 rounded-full blur-md animate-pulse" />
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600
                            flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">Crafting suggestions</p>
            <p className="text-xs text-gray-500">AI is analyzing the conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-violet-500/[0.08] via-transparent to-fuchsia-500/[0.08]
                    border border-violet-200/40 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600
                          flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Smart Replies</span>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl hover:bg-white/60 transition-all duration-200 group"
        >
          <RefreshCw className="w-4 h-4 text-gray-400 group-hover:text-violet-600
                                group-hover:rotate-180 transition-all duration-500" />
        </button>
      </div>
      <div className="grid gap-2.5">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelectSuggestion(suggestion)}
            className="group relative w-full text-left p-4 rounded-xl
                       bg-white/70 hover:bg-white border border-gray-100/80 hover:border-violet-200
                       shadow-sm hover:shadow-md hover:shadow-violet-500/5
                       transition-all duration-300 ease-out"
          >
            <p className="text-sm text-gray-700 leading-relaxed pr-8 line-clamp-2">
              {suggestion}
            </p>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full
                            bg-gray-100 group-hover:bg-gradient-to-r group-hover:from-violet-500 group-hover:to-purple-600
                            flex items-center justify-center transition-all duration-300">
              <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-white transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
