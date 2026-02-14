import { useState, useCallback, useRef } from 'react';

export interface ToolCall {
  toolCallId: string;
  toolName: string;
  displayName: string;
  status: 'calling' | 'success' | 'error';
  summary?: string;
}

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
  toolCalls: ToolCall[];
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
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const textBufferRef = useRef('');

  const reset = useCallback(() => {
    setStreamedText('');
    setIsStreaming(false);
    setIsWaitingForResponse(false);
    setError(null);
    setUserMessageId(null);
    setConnectActions([]);
    setToolCalls([]);
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
    setToolCalls([]);
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

            // New typed events
            if (data.type === 'text') {
              textBufferRef.current += data.content;
              setStreamedText(cleanConnectActionMarkers(textBufferRef.current));
            } else if (data.type === 'tool_call_start') {
              setToolCalls(prev => [
                ...prev,
                {
                  toolCallId: data.toolCallId,
                  toolName: data.toolName,
                  displayName: data.displayName || data.toolName,
                  status: 'calling',
                },
              ]);
            } else if (data.type === 'tool_call_result') {
              setToolCalls(prev =>
                prev.map(tc =>
                  tc.toolCallId === data.toolCallId
                    ? {
                        ...tc,
                        status: data.status === 'error' ? 'error' as const : 'success' as const,
                        summary: data.summary,
                        displayName: data.displayName || tc.displayName,
                      }
                    : tc
                )
              );
            } else if (data.type === 'connect_action' && data.connectActions) {
              setConnectActions(data.connectActions);
            }

            // Legacy format support (backward compat with old text-only events)
            if (data.text && !data.type) {
              textBufferRef.current += data.text;
              setStreamedText(cleanConnectActionMarkers(textBufferRef.current));
            }

            // Legacy connect actions format
            if (data.connectActions && !data.type) {
              setConnectActions(data.connectActions);
            }

            if (data.done) {
              // Persist tool calls from done signal if available
              if (data.toolCalls && Array.isArray(data.toolCalls)) {
                setToolCalls(data.toolCalls.map((tc: any) => ({
                  ...tc,
                  status: tc.status || 'success',
                })));
              }
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
    toolCalls,
    startStream,
    stopStream,
    reset,
  };
}

export default useStreamingChat;
