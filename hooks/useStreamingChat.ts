import { useState, useCallback, useRef } from 'react';

interface StreamParams {
  conversationId: string;
  message: string;
  model: string;
  files?: any[];
  pastedContent?: any[];
  isThinkingEnabled?: boolean;
}

interface ConnectAction {
  connectLink: string;
  connectAppName: string;
}

interface UseStreamingChatReturn {
  streamedText: string;
  isStreaming: boolean;
  isWaitingForResponse: boolean;
  error: Error | null;
  userMessageId: string | null;
  connectActions: ConnectAction[];
  startStream: (params: StreamParams) => Promise<void>;
  stopStream: () => void;
  reset: () => void;
}

// Clean [CONNECT_ACTION:...] markers from text for display
function cleanConnectActionMarkers(text: string): string {
  return text.replace(/\[CONNECT_ACTION:[^\]]+\]/g, '').trim();
}

export function useStreamingChat(): UseStreamingChatReturn {
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [userMessageId, setUserMessageId] = useState<string | null>(null);
  const [connectActions, setConnectActions] = useState<ConnectAction[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const textBufferRef = useRef('');

  const reset = useCallback(() => {
    setStreamedText('');
    setIsStreaming(false);
    setIsWaitingForResponse(false);
    setError(null);
    setUserMessageId(null);
    setConnectActions([]);
    textBufferRef.current = '';
  }, []);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsWaitingForResponse(false);
  }, []);

  const startStream = useCallback(async (params: StreamParams) => {
    // Reset state
    setStreamedText('');
    setError(null);
    setIsWaitingForResponse(true);
    setIsStreaming(false);
    setConnectActions([]);
    textBufferRef.current = '';

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/ai-chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: abortControllerRef.current.signal,
      });

      // Check for non-OK response
      if (!response.ok) {
        let errorMessage = 'Something went wrong. Please try again.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Couldn't parse error JSON
        }
        throw new Error(errorMessage);
      }

      // Get user message ID from headers
      const messageId = response.headers.get('X-User-Message-Id');
      if (messageId) {
        setUserMessageId(messageId);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Unable to read response. Please try again.');
      }

      const decoder = new TextDecoder();
      setIsWaitingForResponse(false);
      setIsStreaming(true);

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6); // Remove 'data: ' prefix
          if (!jsonStr.trim()) continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.error) {
              throw new Error(data.error);
            }

            if (data.text) {
              textBufferRef.current += data.text;
              // Clean [CONNECT_ACTION:...] markers for display
              setStreamedText(cleanConnectActionMarkers(textBufferRef.current));
            }

            // Handle connect actions from agentic UI
            if (data.connectActions && Array.isArray(data.connectActions)) {
              setConnectActions(data.connectActions);
            }

            if (data.done) {
              // Stream complete
              break;
            }
          } catch (parseError: any) {
            // If it's our thrown error, re-throw it
            if (parseError.message && !parseError.message.includes('JSON')) {
              throw parseError;
            }
            // Otherwise ignore parse errors for malformed lines
            console.warn('[streaming] Parse error:', parseError);
          }
        }
      }

      setIsStreaming(false);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled, not an error
        setIsStreaming(false);
        setIsWaitingForResponse(false);
        return;
      }

      console.error('[streaming] Error:', err);
      setError(err instanceof Error ? err : new Error(err?.message || 'Something went wrong. Please try again.'));
      setIsStreaming(false);
      setIsWaitingForResponse(false);
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  return {
    streamedText,
    isStreaming,
    isWaitingForResponse,
    error,
    userMessageId,
    connectActions,
    startStream,
    stopStream,
    reset,
  };
}

export default useStreamingChat;
