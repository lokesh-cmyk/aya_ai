# AYA AI: Enhanced Tool Execution & Generative UI — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix broken multi-step tool execution, add visible tool call indicators, and render rich generative UI components in AYA AI Chat.

**Architecture:** Enhanced SSE protocol streams tool-call events alongside text. Frontend renders tool calls as collapsible cards and parses `:::component{...}` markers into rich React components. System prompt updated to stop AI from narrating tool calls.

**Tech Stack:** Next.js 14+, Vercel AI SDK v6 (`ai@^6.0.59`, `@ai-sdk/anthropic@^3.0.29`), React 18, TailwindCSS v4, `lucide-react`, `react-markdown`, Composio SDK, Prisma ORM.

**Design Doc:** `docs/plans/2026-02-14-aya-ai-enhanced-tool-execution-generative-ui-design.md`

---

## Task 1: Create Tool Display Name Utility (`lib/tool-display-names.ts`)

**Files:**
- Create: `lib/tool-display-names.ts`

**Step 1: Create the utility file**

This file maps raw Composio tool names to human-friendly display names and generates short summaries from tool results.

```typescript
// lib/tool-display-names.ts

/**
 * Maps raw Composio/AI tool names to human-friendly display names.
 * Also provides helpers to summarize tool results for the UI.
 */

const TOOL_NAME_MAP: Record<string, string> = {
  // Composio meta tools
  COMPOSIO_SEARCH_TOOLS: 'Search Tools',
  COMPOSIO_MANAGE_CONNECTIONS: 'Manage Connections',

  // ClickUp
  CLICKUP_GET_TASKS: 'ClickUp: Get Tasks',
  CLICKUP_CREATE_TASK: 'ClickUp: Create Task',
  CLICKUP_UPDATE_TASK: 'ClickUp: Update Task',
  CLICKUP_GET_SPACES: 'ClickUp: Get Spaces',
  CLICKUP_GET_LISTS: 'ClickUp: Get Lists',
  CLICKUP_GET_TASK: 'ClickUp: Get Task',
  CLICKUP_GET_FOLDERS: 'ClickUp: Get Folders',

  // Google Calendar
  GOOGLECALENDAR_LIST_EVENTS: 'Google Calendar: List Events',
  GOOGLECALENDAR_CREATE_EVENT: 'Google Calendar: Create Event',
  GOOGLECALENDAR_UPDATE_EVENT: 'Google Calendar: Update Event',
  GOOGLECALENDAR_DELETE_EVENT: 'Google Calendar: Delete Event',
  GOOGLECALENDAR_FIND_FREE_SLOTS: 'Google Calendar: Find Free Slots',
  GOOGLECALENDAR_GET_CALENDAR: 'Google Calendar: Get Calendar',

  // Instagram
  INSTAGRAM_GET_INSIGHTS: 'Instagram: Get Insights',
  INSTAGRAM_GET_MEDIA: 'Instagram: Get Media',
  INSTAGRAM_SEND_MESSAGE: 'Instagram: Send Message',

  // LinkedIn
  LINKEDIN_CREATE_LINKED_IN_POST: 'LinkedIn: Create Post',
  LINKEDIN_DELETE_LINKED_IN_POST: 'LinkedIn: Delete Post',
  LINKEDIN_GET_COMPANY_INFO: 'LinkedIn: Get Company Info',
  LINKEDIN_GET_MY_INFO: 'LinkedIn: Get My Info',
  LINKEDIN_CREATE_COMMENT_ON_POST: 'LinkedIn: Create Comment',
  LINKEDIN_GET_IMAGES: 'LinkedIn: Get Images',
  LINKEDIN_GET_VIDEO: 'LinkedIn: Get Video',
  LINKEDIN_GET_VIDEOS: 'LinkedIn: Get Videos',
  LINKEDIN_REGISTER_IMAGE_UPLOAD: 'LinkedIn: Register Image Upload',
};

/**
 * Convert a raw tool name like "CLICKUP_GET_TASKS" to a friendly display name.
 * Falls back to title-casing the raw name if not in the map.
 */
export function getToolDisplayName(toolName: string): string {
  if (TOOL_NAME_MAP[toolName]) {
    return TOOL_NAME_MAP[toolName];
  }

  // Fallback: Convert SCREAMING_SNAKE_CASE to Title Case
  return toolName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate a short human-readable summary from a tool's result payload.
 * Handles arrays (count items), objects (extract key fields), and strings (truncate).
 */
export function summarizeToolResult(toolName: string, result: unknown): string {
  try {
    // Handle null/undefined
    if (result === null || result === undefined) {
      return 'Completed';
    }

    // Handle string results
    if (typeof result === 'string') {
      // Check if it's JSON string
      try {
        const parsed = JSON.parse(result);
        return summarizeToolResult(toolName, parsed);
      } catch {
        return result.length > 80 ? result.substring(0, 77) + '...' : result;
      }
    }

    // Handle arrays — count items
    if (Array.isArray(result)) {
      const count = result.length;
      const toolLower = toolName.toLowerCase();

      if (toolLower.includes('task')) return `Found ${count} task${count !== 1 ? 's' : ''}`;
      if (toolLower.includes('event')) return `Found ${count} event${count !== 1 ? 's' : ''}`;
      if (toolLower.includes('message')) return `Found ${count} message${count !== 1 ? 's' : ''}`;
      if (toolLower.includes('space')) return `Found ${count} space${count !== 1 ? 's' : ''}`;
      if (toolLower.includes('list')) return `Found ${count} list${count !== 1 ? 's' : ''}`;
      if (toolLower.includes('folder')) return `Found ${count} folder${count !== 1 ? 's' : ''}`;
      if (toolLower.includes('image')) return `Found ${count} image${count !== 1 ? 's' : ''}`;
      if (toolLower.includes('video')) return `Found ${count} video${count !== 1 ? 's' : ''}`;

      return `Returned ${count} result${count !== 1 ? 's' : ''}`;
    }

    // Handle objects
    if (typeof result === 'object') {
      const obj = result as Record<string, unknown>;

      // Check for common response wrappers
      if ('data' in obj && Array.isArray(obj.data)) {
        return summarizeToolResult(toolName, obj.data);
      }
      if ('tasks' in obj && Array.isArray(obj.tasks)) {
        return summarizeToolResult(toolName, obj.tasks);
      }
      if ('events' in obj && Array.isArray(obj.events)) {
        return summarizeToolResult(toolName, obj.events);
      }
      if ('items' in obj && Array.isArray(obj.items)) {
        return summarizeToolResult(toolName, obj.items);
      }
      if ('results' in obj && Array.isArray(obj.results)) {
        return summarizeToolResult(toolName, obj.results);
      }

      // Check for Composio search tools response
      if ('tools' in obj && Array.isArray(obj.tools)) {
        return `Found ${(obj.tools as unknown[]).length} available tool${(obj.tools as unknown[]).length !== 1 ? 's' : ''}`;
      }

      // Check for connect link (manage connections)
      if ('connectLink' in obj || 'connect_link' in obj || 'url' in obj) {
        return 'Connection link generated';
      }

      // Check for success/message field
      if ('message' in obj && typeof obj.message === 'string') {
        const msg = obj.message as string;
        return msg.length > 80 ? msg.substring(0, 77) + '...' : msg;
      }
      if ('successfull' in obj || 'successful' in obj) {
        return 'Completed successfully';
      }

      // Fallback for objects: describe key count
      const keys = Object.keys(obj);
      if (keys.length <= 3) {
        return `Returned: ${keys.join(', ')}`;
      }
      return 'Completed successfully';
    }

    return String(result).substring(0, 80);
  } catch {
    return 'Completed';
  }
}
```

**Step 2: Commit**

```bash
git add lib/tool-display-names.ts
git commit -m "feat(ai-chat): add tool display name mapping and result summarizer"
```

---

## Task 2: Enhance Backend SSE Protocol (`app/api/ai-chat/stream/route.ts`)

**Files:**
- Modify: `app/api/ai-chat/stream/route.ts`
- Reference: `lib/tool-display-names.ts` (from Task 1)

This is the critical fix. We replace `result.textStream` with `result.fullStream` to capture tool-call events, and we update the system prompt to stop the AI from narrating tool calls.

**Step 1: Add import for tool display names**

At the top of `stream/route.ts`, add:

```typescript
import { getToolDisplayName, summarizeToolResult } from '@/lib/tool-display-names';
```

**Step 2: Update the system prompt — add tool execution behavior and generative UI instructions**

In the `buildSystemPrompt()` function, replace the existing `## Response Guidelines` section and add new sections. After the `## Using Integration Tools` section, replace everything from `## Response Guidelines` onwards (but before the memories/context sections) with:

```typescript
prompt += `

## Tool Execution Behavior

CRITICAL: When you need to use tools, JUST USE THEM SILENTLY. Do NOT narrate what you are about to do.

BAD examples (NEVER do this):
- "I'll fetch your tasks from ClickUp to give you an overview."
- "Let me look up your calendar events."
- "Now let me process this data to create a summary."
- "First, I'll search for the available tools..."

GOOD examples (DO this):
- [silently call tools, then present the results directly]
- "Here are your active tasks across 3 projects: ..."
- "You have 5 upcoming events this week: ..."

Rules:
- Do NOT say "Let me fetch...", "I'll look up...", "Now let me process...", "First, let me..."
- Call tools directly without announcing them
- If multiple tool calls are needed, make them all without narrating each step
- Only speak to the user AFTER you have the data to present
- If a tool call fails, briefly mention it and suggest reconnecting

## Rich UI Formatting

When presenting structured data (lists of tasks, events, emails, meetings, posts), use component blocks for rich rendering in the chat UI. Wrap structured data in this format:

\`\`\`
:::component{type="TYPE_NAME"}
JSON_ARRAY_OR_OBJECT_HERE
:::
\`\`\`

Available component types and their JSON schemas:

### task_table
Use when presenting 2+ tasks. Each object:
{"name": "string", "status": "string", "priority": "string (HIGH/MEDIUM/LOW/URGENT/NONE)", "dueDate": "ISO date string or null", "assignee": "string or null", "project": "string or null"}

### calendar_events
Use when presenting 2+ calendar events. Each object:
{"title": "string", "start": "ISO datetime", "end": "ISO datetime", "location": "string or null", "attendees": ["string array"], "description": "string or null"}

### email_summary
Use when presenting 2+ emails. Each object:
{"from": "string", "subject": "string", "snippet": "string (first ~100 chars)", "date": "ISO datetime", "isUrgent": true/false}

### meeting_summary
Use for a single meeting with insights. Object:
{"title": "string", "date": "ISO datetime", "duration": "number (minutes) or null", "participants": ["string array"], "summary": "string", "actionItems": [{"task": "string", "owner": "string or null"}], "keyTopics": ["string array"]}

### social_post
Use when presenting social media posts. Each object:
{"platform": "instagram|linkedin", "content": "string", "date": "ISO datetime", "likes": "number or null", "comments": "number or null", "imageUrl": "string or null"}

Rules for component blocks:
- Always include a brief text summary before or after the component block for context
- The JSON inside must be valid JSON (array for multiple items, object for single items)
- For single items, use the object form directly
- For lists, use an array
- Do NOT wrap the same data as both text AND component — pick one

## Response Guidelines

1. When a user asks about a **connected** integration, USE YOUR TOOLS to fetch real data and take actions. Do not just describe capabilities — actually use the tools.

2. When a user asks about a **disconnected** integration, respond helpfully:
   - Acknowledge what they're trying to do
   - Explain that the integration is not yet connected
   - Guide them to connect it (Settings > Integrations page)
   - **IMPORTANT**: If the service supports connection, include this EXACT format in your response so we can show a Connect button:

   [CONNECT_ACTION:integrationName:Display Name]

   For example:
   - For Google Calendar: [CONNECT_ACTION:googleCalendar:Google Calendar]
   - For ClickUp: [CONNECT_ACTION:clickup:ClickUp]
   - For Instagram: [CONNECT_ACTION:instagram:Instagram]
   - For LinkedIn: [CONNECT_ACTION:linkedin:LinkedIn]

   Only include ONE connect action per response, for the primary service the user is asking about.

3. Be concise and helpful. Use your memories about this user to personalize responses naturally.

4. For meeting-related questions, use the provided meeting context to summarize, find action items, or help with follow-ups.

5. Present data using component blocks when you have structured results. Always add a brief text insight before or after the component.
`;
```

**Step 3: Replace the streaming logic — switch from textStream to fullStream**

Replace the entire `ReadableStream` block (from `const stream = new ReadableStream({` to the matching `});`) with the new implementation that uses `result.fullStream`:

```typescript
    // Create streaming response using ReadableStream
    const encoder = new TextEncoder();
    let fullResponse = '';
    const toolCallsMetadata: Array<{
      toolCallId: string;
      toolName: string;
      displayName: string;
      status: 'success' | 'error';
      summary: string;
    }> = [];

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = streamText({
            model: anthropic(claudeModel),
            system: systemPrompt,
            messages,
            tools: Object.keys(composioTools).length > 0 ? composioTools : undefined,
            maxSteps: Object.keys(composioTools).length > 0 ? 10 : 1,
            maxTokens: isThinkingEnabled ? 16000 : 8000,
          });

          // Use fullStream to get ALL events including tool calls
          for await (const part of result.fullStream) {
            switch (part.type) {
              case 'text': {
                fullResponse += part.text;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'text', content: part.text })}\n\n`)
                );
                break;
              }

              case 'tool-call': {
                const displayName = getToolDisplayName(part.toolName);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'tool_call_start',
                    toolCallId: part.toolCallId,
                    toolName: part.toolName,
                    displayName,
                  })}\n\n`)
                );
                break;
              }

              case 'tool-result': {
                const displayName = getToolDisplayName(part.toolName);
                const summary = summarizeToolResult(part.toolName, part.result);
                const status = 'success';

                toolCallsMetadata.push({
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  displayName,
                  status,
                  summary,
                });

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'tool_call_result',
                    toolCallId: part.toolCallId,
                    toolName: part.toolName,
                    displayName,
                    status,
                    summary,
                  })}\n\n`)
                );
                break;
              }

              // Ignore other part types (reasoning, source, etc.)
              default:
                break;
            }
          }

          // Parse connect actions from the response for agentic UI
          const connectActions = parseConnectActions(fullResponse);
          const cleanedResponse = cleanResponseText(fullResponse);

          // Build metadata with connect actions and tool calls
          const messageMetadata: Record<string, any> = {
            thinking: isThinkingEnabled ? 'Extended thinking enabled' : undefined,
            toolCalls: toolCallsMetadata.length > 0 ? toolCallsMetadata : undefined,
          };
          if (connectActions.length > 0) {
            messageMetadata.connectActions = connectActions;
            messageMetadata.connectLink = connectActions[0].connectLink;
            messageMetadata.connectAppName = connectActions[0].connectAppName;
          }

          // Save assistant message after streaming completes (with cleaned content)
          await (prisma as any).aIChatMessage.create({
            data: {
              conversationId,
              role: 'assistant',
              content: cleanedResponse || 'I couldn\'t generate a response.',
              model: claudeModel,
              metadata: messageMetadata,
            },
          });

          // Update conversation timestamp
          await (prisma as any).aIChatConversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          // Store conversation to mem0 for memory extraction (async, non-blocking)
          if (isMem0Configured() && cleanedResponse) {
            storeMemoryAsync(session.user.id, [
              { role: 'user', content: message },
              { role: 'assistant', content: cleanedResponse },
            ], {
              conversationId,
              timestamp: new Date().toISOString(),
              model: claudeModel,
            });
          }

          // Send connect actions to client for agentic UI (before done signal)
          if (connectActions.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connect_action', connectActions })}\n\n`));
          }

          // Send done signal with tool call metadata for persistence
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            done: true,
            toolCalls: toolCallsMetadata.length > 0 ? toolCallsMetadata : undefined,
          })}\n\n`));
          controller.close();
        } catch (error: any) {
          console.error('[ai-chat/stream] Stream error:', error);
          const errorMessage = getErrorMessage(error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
          controller.close();
        }
      },
    });
```

Also note: we change `stopWhen: stepCountIs(5)` to `maxSteps: 10` and increase `maxOutputTokens` from `2048`/`4096` to `8000`/`16000` so the AI has room for structured data + text.

**Step 4: Commit**

```bash
git add app/api/ai-chat/stream/route.ts
git commit -m "feat(ai-chat): stream tool call events via fullStream, update system prompt for silent tool execution and generative UI"
```

---

## Task 3: Enhance Streaming Hook (`hooks/useStreamingChat.ts`)

**Files:**
- Modify: `hooks/useStreamingChat.ts`

**Step 1: Add ToolCall type and new state**

Add the `ToolCall` interface and export it. Add `toolCalls` state. Update the SSE parser to handle new event types.

Replace the entire file content with:

```typescript
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

            // Handle new typed events
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
                        status: data.status === 'error' ? 'error' : 'success',
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
```

**Step 2: Commit**

```bash
git add hooks/useStreamingChat.ts
git commit -m "feat(ai-chat): add tool call tracking to streaming hook with new SSE event types"
```

---

## Task 4: Create ToolCallCard Component (`components/ai-chat/ToolCallCard.tsx`)

**Files:**
- Create: `components/ai-chat/ToolCallCard.tsx`

**Step 1: Create the component**

```typescript
"use client";

import React, { useState, memo } from 'react';
import { CheckCircle2, XCircle, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolCallCardProps {
  toolName: string;
  displayName: string;
  status: 'calling' | 'success' | 'error';
  summary?: string;
}

export const ToolCallCard = memo(function ToolCallCard({
  displayName,
  status,
  summary,
}: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusIcon = {
    calling: <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />,
    success: <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />,
    error: <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
  };

  const statusText = status === 'calling' ? 'Running...' : summary || 'Completed';

  const displayText = status === 'calling'
    ? displayName
    : `${displayName}${summary ? `: ${summary}` : ''}`;

  return (
    <button
      onClick={() => setIsExpanded(!isExpanded)}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all',
        'bg-gray-50/80 hover:bg-gray-100/80',
        status === 'error' ? 'border-red-200' : 'border-gray-200/80',
      )}
    >
      {statusIcon[status]}

      <span
        className={cn(
          'flex-1 text-sm truncate',
          status === 'calling' ? 'text-gray-600' : 'text-gray-700',
        )}
      >
        {isExpanded ? (
          <>
            <span className="font-medium">{displayName}</span>
            {summary && (
              <span className="text-gray-500">: {summary}</span>
            )}
            {status === 'calling' && (
              <span className="text-gray-400 italic"> Running...</span>
            )}
          </>
        ) : (
          <>
            {status === 'calling' ? (
              <>
                <span className="font-medium">{displayName}</span>
                <span className="text-gray-400 italic ml-1">Running...</span>
              </>
            ) : (
              displayText
            )}
          </>
        )}
      </span>

      <ChevronDown
        className={cn(
          'w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200',
          isExpanded && 'rotate-180'
        )}
      />
    </button>
  );
});

export default ToolCallCard;
```

**Step 2: Commit**

```bash
git add components/ai-chat/ToolCallCard.tsx
git commit -m "feat(ai-chat): add ToolCallCard component for tool execution indicators"
```

---

## Task 5: Create Generative UI Components

**Files:**
- Create: `components/ai-chat/generative-ui/TaskTable.tsx`
- Create: `components/ai-chat/generative-ui/CalendarEventCard.tsx`
- Create: `components/ai-chat/generative-ui/EmailSummaryCard.tsx`
- Create: `components/ai-chat/generative-ui/MeetingSummaryCard.tsx`
- Create: `components/ai-chat/generative-ui/SocialPostCard.tsx`
- Create: `components/ai-chat/generative-ui/index.ts`

**Step 1: Create TaskTable component**

File: `components/ai-chat/generative-ui/TaskTable.tsx`

```tsx
"use client";

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface Task {
  name: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  assignee?: string | null;
  project?: string | null;
}

interface TaskTableProps {
  data: Task | Task[];
}

function getPriorityColor(priority?: string): string {
  switch (priority?.toUpperCase()) {
    case 'URGENT': return 'bg-red-100 text-red-700';
    case 'HIGH': return 'bg-orange-100 text-orange-700';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
    case 'LOW': return 'bg-blue-100 text-blue-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function getStatusColor(status?: string): string {
  const s = status?.toUpperCase() || '';
  if (s.includes('DONE') || s.includes('COMPLETE') || s.includes('CLOSED')) return 'bg-green-100 text-green-700';
  if (s.includes('PROGRESS') || s.includes('ACTIVE')) return 'bg-blue-100 text-blue-700';
  if (s.includes('REVIEW')) return 'bg-purple-100 text-purple-700';
  if (s.includes('BLOCK')) return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const TaskTable = memo(function TaskTable({ data }: TaskTableProps) {
  const tasks = Array.isArray(data) ? data : [data];

  if (tasks.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden my-2">
      {/* Mobile: card layout, Desktop: table layout */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-gray-600">Task</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Priority</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Due Date</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, i) => (
              <tr key={i} className={cn('border-b border-gray-100 last:border-0', i % 2 === 1 && 'bg-gray-50/50')}>
                <td className="px-3 py-2 font-medium text-gray-800 max-w-[200px] truncate">
                  {task.name}
                  {task.project && <span className="block text-xs text-gray-400">{task.project}</span>}
                </td>
                <td className="px-3 py-2">
                  <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(task.status))}>
                    {task.status || 'Open'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium', getPriorityColor(task.priority))}>
                    {task.priority || 'None'}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-600">{formatDate(task.dueDate)}</td>
                <td className="px-3 py-2 text-gray-600">{task.assignee || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="sm:hidden divide-y divide-gray-100">
        {tasks.map((task, i) => (
          <div key={i} className="p-3 space-y-1.5">
            <p className="font-medium text-gray-800 text-sm">{task.name}</p>
            {task.project && <p className="text-xs text-gray-400">{task.project}</p>}
            <div className="flex flex-wrap gap-1.5">
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(task.status))}>
                {task.status || 'Open'}
              </span>
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getPriorityColor(task.priority))}>
                {task.priority || 'None'}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatDate(task.dueDate)}</span>
              <span>{task.assignee || 'Unassigned'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
```

**Step 2: Create CalendarEventCard component**

File: `components/ai-chat/generative-ui/CalendarEventCard.tsx`

```tsx
"use client";

import React, { memo } from 'react';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';

interface CalendarEvent {
  title: string;
  start: string;
  end?: string;
  location?: string | null;
  attendees?: string[];
  description?: string | null;
}

interface CalendarEventCardProps {
  data: CalendarEvent | CalendarEvent[];
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getDuration(start: string, end?: string): string | null {
  if (!end) return null;
  try {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hrs}h ${remaining}m` : `${hrs}h`;
  } catch {
    return null;
  }
}

export const CalendarEventCard = memo(function CalendarEventCard({ data }: CalendarEventCardProps) {
  const events = Array.isArray(data) ? data : [data];

  if (events.length === 0) return null;

  return (
    <div className="space-y-2 my-2">
      {events.map((event, i) => {
        const duration = getDuration(event.start, event.end);
        return (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-3 flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm truncate">{event.title}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                <span>{formatDate(event.start)} at {formatTime(event.start)}</span>
                {duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {duration}
                  </span>
                )}
              </div>
              {event.location && (
                <p className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{event.location}</span>
                </p>
              )}
              {event.attendees && event.attendees.length > 0 && (
                <p className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <Users className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{event.attendees.join(', ')}</span>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});
```

**Step 3: Create EmailSummaryCard component**

File: `components/ai-chat/generative-ui/EmailSummaryCard.tsx`

```tsx
"use client";

import React, { memo } from 'react';
import { Mail, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailItem {
  from: string;
  subject: string;
  snippet?: string;
  date?: string;
  isUrgent?: boolean;
}

interface EmailSummaryCardProps {
  data: EmailItem | EmailItem[];
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const EmailSummaryCard = memo(function EmailSummaryCard({ data }: EmailSummaryCardProps) {
  const emails = Array.isArray(data) ? data : [data];

  if (emails.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden my-2">
      {emails.map((email, i) => (
        <div key={i} className={cn('p-3 flex gap-3', email.isUrgent && 'bg-red-50/50')}>
          <div className={cn(
            'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
            email.isUrgent ? 'bg-red-100' : 'bg-gray-100'
          )}>
            {email.isUrgent ? (
              <AlertCircle className="w-4 h-4 text-red-600" />
            ) : (
              <Mail className="w-4 h-4 text-gray-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-gray-800 text-sm truncate">{email.from}</p>
              {email.date && <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(email.date)}</span>}
            </div>
            <p className="text-sm text-gray-700 truncate">{email.subject}</p>
            {email.snippet && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{email.snippet}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});
```

**Step 4: Create MeetingSummaryCard component**

File: `components/ai-chat/generative-ui/MeetingSummaryCard.tsx`

```tsx
"use client";

import React, { memo } from 'react';
import { Video, Users, CheckSquare, Tag } from 'lucide-react';

interface MeetingItem {
  title: string;
  date: string;
  duration?: number | null;
  participants?: string[];
  summary?: string;
  actionItems?: Array<{ task: string; owner?: string | null }>;
  keyTopics?: string[];
}

interface MeetingSummaryCardProps {
  data: MeetingItem | MeetingItem[];
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const MeetingSummaryCard = memo(function MeetingSummaryCard({ data }: MeetingSummaryCardProps) {
  const meetings = Array.isArray(data) ? data : [data];

  if (meetings.length === 0) return null;

  return (
    <div className="space-y-2 my-2">
      {meetings.map((meeting, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {/* Header */}
          <div className="p-3 flex gap-3 border-b border-gray-100">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Video className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm">{meeting.title}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                <span>{formatDate(meeting.date)}</span>
                {meeting.duration && <span>{meeting.duration} min</span>}
              </div>
            </div>
          </div>

          {/* Participants */}
          {meeting.participants && meeting.participants.length > 0 && (
            <div className="px-3 py-2 border-b border-gray-100 flex items-start gap-2">
              <Users className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600">{meeting.participants.join(', ')}</p>
            </div>
          )}

          {/* Summary */}
          {meeting.summary && (
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed">{meeting.summary}</p>
            </div>
          )}

          {/* Action Items */}
          {meeting.actionItems && meeting.actionItems.length > 0 && (
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Action Items</span>
              </div>
              <ul className="space-y-1">
                {meeting.actionItems.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                    <span className="text-gray-700">
                      {item.task}
                      {item.owner && <span className="text-gray-400 ml-1">({item.owner})</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Topics */}
          {meeting.keyTopics && meeting.keyTopics.length > 0 && (
            <div className="px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Tag className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Key Topics</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {meeting.keyTopics.map((topic, j) => (
                  <span key={j} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});
```

**Step 5: Create SocialPostCard component**

File: `components/ai-chat/generative-ui/SocialPostCard.tsx`

```tsx
"use client";

import React, { memo } from 'react';
import { Instagram, Linkedin, Heart, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SocialPost {
  platform: 'instagram' | 'linkedin';
  content: string;
  date?: string;
  likes?: number | null;
  comments?: number | null;
  imageUrl?: string | null;
}

interface SocialPostCardProps {
  data: SocialPost | SocialPost[];
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const SocialPostCard = memo(function SocialPostCard({ data }: SocialPostCardProps) {
  const posts = Array.isArray(data) ? data : [data];

  if (posts.length === 0) return null;

  return (
    <div className="space-y-2 my-2">
      {posts.map((post, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="p-3 flex gap-3">
            <div className={cn(
              'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
              post.platform === 'instagram' ? 'bg-pink-50' : 'bg-[#0A66C2]/10'
            )}>
              {post.platform === 'instagram' ? (
                <Instagram className="w-4 h-4 text-pink-600" />
              ) : (
                <Linkedin className="w-4 h-4 text-[#0A66C2]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-500 capitalize">{post.platform}</span>
                {post.date && <span className="text-xs text-gray-400">{formatDate(post.date)}</span>}
              </div>
              <p className="text-sm text-gray-700 mt-1 line-clamp-3">{post.content}</p>
              {(post.likes != null || post.comments != null) && (
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  {post.likes != null && (
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {post.likes.toLocaleString()}
                    </span>
                  )}
                  {post.comments != null && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {post.comments.toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
```

**Step 6: Create barrel export**

File: `components/ai-chat/generative-ui/index.ts`

```typescript
export { TaskTable } from './TaskTable';
export { CalendarEventCard } from './CalendarEventCard';
export { EmailSummaryCard } from './EmailSummaryCard';
export { MeetingSummaryCard } from './MeetingSummaryCard';
export { SocialPostCard } from './SocialPostCard';
```

**Step 7: Commit**

```bash
git add components/ai-chat/generative-ui/
git commit -m "feat(ai-chat): add generative UI components for tasks, calendar, email, meetings, social"
```

---

## Task 6: Create GenerativeUIRenderer (`components/ai-chat/GenerativeUIRenderer.tsx`)

**Files:**
- Create: `components/ai-chat/GenerativeUIRenderer.tsx`

This component parses message content, splits on `:::component{...}` markers, and renders the appropriate generative UI component for each block, with markdown rendering for text segments.

**Step 1: Create the renderer**

```tsx
"use client";

import React, { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  TaskTable,
  CalendarEventCard,
  EmailSummaryCard,
  MeetingSummaryCard,
  SocialPostCard,
} from './generative-ui';

interface GenerativeUIRendererProps {
  content: string;
  className?: string;
}

interface ContentSegment {
  type: 'text' | 'component';
  content: string;
  componentType?: string;
  data?: unknown;
}

// Regex to match :::component{type="..."}\n...\n:::
const COMPONENT_REGEX = /:::component\{type="([^"]+)"\}\s*\n([\s\S]*?)\n:::/g;

function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  // Reset regex lastIndex
  COMPONENT_REGEX.lastIndex = 0;

  let match;
  while ((match = COMPONENT_REGEX.exec(content)) !== null) {
    // Text before this component
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim();
      if (textBefore) {
        segments.push({ type: 'text', content: textBefore });
      }
    }

    // The component block
    const componentType = match[1];
    const jsonString = match[2].trim();

    try {
      const data = JSON.parse(jsonString);
      segments.push({
        type: 'component',
        content: '',
        componentType,
        data,
      });
    } catch {
      // If JSON parsing fails, render as text
      segments.push({ type: 'text', content: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last component
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) {
      segments.push({ type: 'text', content: remaining });
    }
  }

  return segments;
}

function renderComponent(componentType: string, data: unknown): React.ReactNode {
  switch (componentType) {
    case 'task_table':
      return <TaskTable data={data as any} />;
    case 'calendar_events':
      return <CalendarEventCard data={data as any} />;
    case 'email_summary':
      return <EmailSummaryCard data={data as any} />;
    case 'meeting_summary':
      return <MeetingSummaryCard data={data as any} />;
    case 'social_post':
      return <SocialPostCard data={data as any} />;
    default:
      // Unknown component type — render the raw JSON as a code block
      return (
        <pre className="text-xs bg-gray-100 rounded p-2 overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
  }
}

export const GenerativeUIRenderer = memo(function GenerativeUIRenderer({
  content,
  className = '',
}: GenerativeUIRendererProps) {
  const segments = useMemo(() => parseContent(content), [content]);

  // If no component markers found, render plain markdown
  if (segments.length === 1 && segments[0].type === 'text') {
    return (
      <div className={`prose prose-sm max-w-none text-gray-800 ${className}`}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {segments.map((segment, i) => {
        if (segment.type === 'text') {
          return (
            <div key={i} className="prose prose-sm max-w-none text-gray-800">
              <ReactMarkdown>{segment.content}</ReactMarkdown>
            </div>
          );
        }

        if (segment.type === 'component' && segment.componentType && segment.data) {
          return (
            <React.Fragment key={i}>
              {renderComponent(segment.componentType, segment.data)}
            </React.Fragment>
          );
        }

        return null;
      })}
    </div>
  );
});

export default GenerativeUIRenderer;
```

**Step 2: Commit**

```bash
git add components/ai-chat/GenerativeUIRenderer.tsx
git commit -m "feat(ai-chat): add GenerativeUIRenderer to parse and render component blocks in messages"
```

---

## Task 7: Update MessageBubble to Render Tool Calls and Generative UI

**Files:**
- Modify: `components/ai-chat/MessageBubble.tsx`

**Step 1: Update the component**

Replace the entire `MessageBubble.tsx` file. Key changes:
- Import `ToolCallCard` and `GenerativeUIRenderer`
- Accept `toolCalls` prop
- Render tool call cards above the message text
- Use `GenerativeUIRenderer` instead of raw `ReactMarkdown` for assistant messages
- Render tool calls from message metadata for persisted (non-streaming) messages

```tsx
"use client";

import React, { memo } from 'react';
import { Sparkles, Calendar, ListTodo, ExternalLink, Instagram, Linkedin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MessageActions } from './MessageActions';
import { StreamingMessage } from './StreamingMessage';
import { ToolCallCard, type ToolCallCardProps } from './ToolCallCard';
import { GenerativeUIRenderer } from './GenerativeUIRenderer';

interface ToolCallData {
  toolCallId: string;
  toolName: string;
  displayName: string;
  status: 'calling' | 'success' | 'error';
  summary?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  metadata?: any;
}

interface MessageBubbleProps {
  message: Message;
  userInitial: string;
  isStreaming?: boolean;
  streamedContent?: string;
  toolCalls?: ToolCallData[];
  onRegenerate?: () => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  userInitial,
  isStreaming = false,
  streamedContent,
  toolCalls,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const displayContent = isStreaming ? streamedContent || '' : message.content;

  // Extract connect actions for Agentic UI
  const connectActions = Array.isArray(message.metadata?.connectActions)
    ? message.metadata.connectActions as Array<{ connectLink: string; connectAppName: string }>
    : message.metadata?.connectLink
      ? [{ connectLink: String(message.metadata.connectLink), connectAppName: String(message.metadata?.connectAppName ?? "App") }]
      : [];

  // Tool calls: use live streaming tool calls if available, otherwise from saved metadata
  const displayToolCalls: ToolCallData[] = toolCalls && toolCalls.length > 0
    ? toolCalls
    : (message.metadata?.toolCalls || []);

  return (
    <div
      className={cn(
        'flex gap-3 sm:gap-4 animate-message-slide-in group',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Message Content */}
      <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-[80%]">
        {/* Tool Call Cards — rendered above the message bubble */}
        {!isUser && displayToolCalls.length > 0 && (
          <div className="space-y-1.5 mb-1">
            {displayToolCalls.map((tc) => (
              <ToolCallCard
                key={tc.toolCallId}
                toolName={tc.toolName}
                displayName={tc.displayName}
                status={tc.status}
                summary={tc.summary}
              />
            ))}
          </div>
        )}

        <div
          className={cn(
            'rounded-2xl px-4 py-3 shadow-sm',
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-900'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-white text-sm sm:text-base leading-relaxed">
              {message.content}
            </p>
          ) : (
            <div className="space-y-3">
              {isStreaming ? (
                <StreamingMessage content={displayContent} isStreaming={isStreaming} />
              ) : (
                <GenerativeUIRenderer content={displayContent} />
              )}

              {/* Agentic UI: Connect apps */}
              {connectActions.length > 0 && !isStreaming && (
                <div className="mt-3 pt-3 border-t border-gray-200/80 space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Connect your apps
                  </p>
                  <div className="flex flex-col gap-2">
                    {connectActions.map((action, i) => {
                      const isCalendar = /calendar|google/i.test(action.connectAppName);
                      const isClickUp = /clickup/i.test(action.connectAppName);
                      const isInstagram = /instagram/i.test(action.connectAppName);
                      const isLinkedIn = /linkedin/i.test(action.connectAppName);

                      return (
                        <div
                          key={i}
                          className="rounded-xl border border-gray-200/90 bg-gradient-to-br from-white to-gray-50/80 p-3 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm hover:shadow transition-shadow"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className={cn(
                                'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                                isClickUp
                                  ? 'bg-[#7B68EE]/10 text-[#7B68EE]'
                                  : isInstagram
                                    ? 'bg-pink-500/10 text-pink-600'
                                    : isLinkedIn
                                      ? 'bg-[#0A66C2]/10 text-[#0A66C2]'
                                      : 'bg-blue-500/10 text-blue-600'
                              )}
                            >
                              {isClickUp ? (
                                <ListTodo className="w-5 h-5" strokeWidth={2} />
                              ) : isInstagram ? (
                                <Instagram className="w-5 h-5" strokeWidth={2} />
                              ) : isLinkedIn ? (
                                <Linkedin className="w-5 h-5" strokeWidth={2} />
                              ) : (
                                <Calendar className="w-5 h-5" strokeWidth={2} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {action.connectAppName}
                              </p>
                              <p className="text-xs text-gray-500">
                                Authorize to use in chat
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              asChild
                              size="sm"
                              className="rounded-lg bg-black text-white hover:bg-black/90 shadow-sm font-medium"
                            >
                              <a
                                href={action.connectLink}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                Connect
                              </a>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Actions */}
        {!isUser && !isStreaming && (
          <MessageActions
            content={message.content}
            onRegenerate={onRegenerate}
            showRegenerate={!!onRegenerate}
            className="ml-1"
          />
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm shadow-md">
          {userInitial}
        </div>
      )}
    </div>
  );
});

export default MessageBubble;
```

**Step 2: Commit**

```bash
git add components/ai-chat/MessageBubble.tsx
git commit -m "feat(ai-chat): integrate ToolCallCard and GenerativeUIRenderer into MessageBubble"
```

---

## Task 8: Update Chat Page to Pass Tool Calls Through

**Files:**
- Modify: `app/(app)/ai-chat/page.tsx`

**Step 1: Pass toolCalls from useStreamingChat to the streaming MessageBubble**

In `page.tsx`, the `useStreamingChat` hook now returns `toolCalls`. We need to pass this to the streaming `MessageBubble`. Find the streaming message section (around line 594) and update it.

Find in `page.tsx`:
```tsx
  const {
    streamedText,
    isStreaming,
    isWaitingForResponse,
    error: streamError,
    connectActions: streamConnectActions,
    startStream,
    stopStream,
    reset: resetStream,
  } = useStreamingChat();
```

Replace with:
```tsx
  const {
    streamedText,
    isStreaming,
    isWaitingForResponse,
    error: streamError,
    connectActions: streamConnectActions,
    toolCalls: streamToolCalls,
    startStream,
    stopStream,
    reset: resetStream,
  } = useStreamingChat();
```

Then find the streaming MessageBubble (around line 594-607):
```tsx
                    {isStreaming && streamedText && (
                      <MessageBubble
                        message={{
                          id: "streaming",
                          role: "assistant",
                          content: streamedText,
                          createdAt: new Date().toISOString(),
                          metadata: streamConnectActions.length > 0 ? { connectActions: streamConnectActions } : undefined,
                        }}
                        userInitial={userInitial}
                        isStreaming={true}
                        streamedContent={streamedText}
                      />
                    )}
```

Replace with:
```tsx
                    {isStreaming && (streamedText || streamToolCalls.length > 0) && (
                      <MessageBubble
                        message={{
                          id: "streaming",
                          role: "assistant",
                          content: streamedText,
                          createdAt: new Date().toISOString(),
                          metadata: streamConnectActions.length > 0 ? { connectActions: streamConnectActions } : undefined,
                        }}
                        userInitial={userInitial}
                        isStreaming={true}
                        streamedContent={streamedText}
                        toolCalls={streamToolCalls}
                      />
                    )}
```

Key changes:
1. Destructure `toolCalls: streamToolCalls` from the hook
2. Show the streaming bubble when there are tool calls even if `streamedText` is empty (so users see tool indicators before text arrives)
3. Pass `toolCalls={streamToolCalls}` to the streaming MessageBubble

**Step 2: Commit**

```bash
git add app/(app)/ai-chat/page.tsx
git commit -m "feat(ai-chat): pass streaming tool calls to MessageBubble in chat page"
```

---

## Task 9: Update Barrel Exports

**Files:**
- Modify: `components/ai-chat/index.ts`

**Step 1: Add new exports**

```typescript
export { TypingIndicator } from './TypingIndicator';
export { StreamingMessage } from './StreamingMessage';
export { MessageActions } from './MessageActions';
export { MessageBubble } from './MessageBubble';
export { StopGenerationButton } from './StopGenerationButton';
export { ToolCallCard } from './ToolCallCard';
export { GenerativeUIRenderer } from './GenerativeUIRenderer';
```

**Step 2: Commit**

```bash
git add components/ai-chat/index.ts
git commit -m "feat(ai-chat): export ToolCallCard and GenerativeUIRenderer from barrel"
```

---

## Task 10: Manual Testing & Verification

**Step 1: Start the dev server**

```bash
npm run dev
```

**Step 2: Test scenarios**

1. **Tool execution flow**: Ask "Summarize my current projects" — should see:
   - Tool call cards appearing with spinner, then green checkmarks
   - No narration text ("I'll fetch...") — AI should silently call tools
   - Final response with structured data in rich component format

2. **Disconnected integration**: Ask "What's in my calendar?" (if Google Calendar not connected) — should see:
   - Connect button card for Google Calendar
   - Helpful text about connecting

3. **Generative UI components**: Ask "Show me my tasks" — should see:
   - Tool call cards for ClickUp tools
   - Task table component with colored status/priority badges

4. **Persisted tool calls**: Reload the page and view a past conversation — tool call cards should render from saved metadata

5. **Error handling**: Test with invalid integration — should see red X on tool call card

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(ai-chat): complete enhanced tool execution and generative UI implementation"
```
