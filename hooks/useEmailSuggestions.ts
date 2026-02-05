import { useState, useCallback } from 'react';

interface EmailSuggestionsParams {
  emailContent: string;
  senderName?: string;
  senderEmail?: string;
  subject?: string;
  threadMessages?: Array<{ from?: string; content: string }>;
}

interface UseEmailSuggestionsReturn {
  suggestions: string[];
  isLoading: boolean;
  error: string | null;
  fetchSuggestions: (params: EmailSuggestionsParams) => Promise<void>;
  clearSuggestions: () => void;
}

export function useEmailSuggestions(): UseEmailSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async (params: EmailSuggestionsParams) => {
    setIsLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const response = await fetch('/api/ai/email-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to generate suggestions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  return { suggestions, isLoading, error, fetchSuggestions, clearSuggestions };
}
