# AYA AI: Enhanced Tool Execution & Generative UI

**Date:** 2026-02-14
**Status:** Approved
**Scope:** Fix broken tool execution flow, add tool call UI indicators, add rich generative UI components

---

## Problem Statement

1. **Broken tool execution**: When users ask complex questions (e.g., "summarize stale tasks across projects"), AYA narrates tool-calling intentions ("I'll fetch your tasks... Now let me fetch...") as plain text, then the response stops without delivering results. The AI's multi-step tool calls complete server-side but the client never sees tool events or final data.

2. **No tool call visibility**: Users have no indication that tools are being called. There are no loading/progress indicators during tool execution.

3. **Text-only responses**: All responses are plain text/markdown. Structured data (tasks, events, emails) would benefit from rich visual components.

---

## Architecture: Approach A — Enhanced SSE Protocol

Extend the existing SSE streaming to include structured events for tool calls alongside text chunks. No new dependencies required.

---

## 1. Backend — Enhanced SSE Protocol (`stream/route.ts`)

### Root Cause

Line 437 in `stream/route.ts` iterates only over `result.textStream`, which yields final text chunks. Tool call events (start, result, error) from the Vercel AI SDK's multi-step execution are silently consumed server-side and never piped to the client.

### Fix

Replace `result.textStream` with `result.fullStream`, which yields ALL events:
- `text-delta`: Text chunk
- `tool-call`: AI decided to call a tool (includes toolCallId, toolName, args)
- `tool-result`: Tool execution completed (includes toolCallId, result)
- `step-finish`: A step in the multi-step flow completed
- `finish`: Stream complete

### New SSE Event Types

```
data: {"type":"text","content":"Here's your summary..."}
data: {"type":"tool_call_start","toolCallId":"tc_1","toolName":"CLICKUP_GET_TASKS","displayName":"ClickUp: Get Tasks"}
data: {"type":"tool_call_result","toolCallId":"tc_1","toolName":"CLICKUP_GET_TASKS","status":"success","summary":"Fetched 12 tasks from 3 projects"}
data: {"type":"tool_call_result","toolCallId":"tc_2","toolName":"COMPOSIO_SEARCH_TOOLS","status":"error","summary":"Tool search failed"}
data: {"type":"connect_action","connectActions":[...]}
data: {"done":true,"toolCalls":[...]}
```

### Changes

- Switch from `result.textStream` to `result.fullStream`
- Handle `tool-call` parts: emit `tool_call_start` SSE event with friendly display name
- Handle `tool-result` parts: emit `tool_call_result` SSE event with human-readable summary
- Add `summarizeToolResult()` helper that extracts short summaries from tool result payloads
- Increase `maxSteps` from 5 to 10 for complex multi-tool queries
- Store tool call metadata (names, statuses, summaries) in the saved assistant message
- Include tool call history in the `done` signal for persistence

### Tool Result Summarizer (`lib/tool-display-names.ts`)

Maps raw Composio tool names to friendly display names and generates summaries:

```
CLICKUP_GET_TASKS -> "ClickUp: Get Tasks"
GOOGLECALENDAR_LIST_EVENTS -> "Google Calendar: List Events"
COMPOSIO_SEARCH_TOOLS -> "Search Tools"
COMPOSIO_MANAGE_CONNECTIONS -> "Manage Connections"
INSTAGRAM_GET_INSIGHTS -> "Instagram: Get Insights"
LINKEDIN_CREATE_LINKED_IN_POST -> "LinkedIn: Create Post"
```

Summary extraction examines the tool result object for arrays (count items), objects (extract key fields), or strings (truncate).

---

## 2. Frontend — Enhanced Streaming Hook (`useStreamingChat.ts`)

### New Types

```typescript
interface ToolCall {
  toolCallId: string;
  toolName: string;
  displayName: string;
  status: 'calling' | 'success' | 'error';
  summary?: string;
}
```

### New State

```typescript
const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
```

### SSE Parsing Changes

- `type: "tool_call_start"` -> append to `toolCalls` with status `'calling'`
- `type: "tool_call_result"` -> update matching entry's status and summary
- `type: "text"` -> same as current, append to `streamedText`
- Return `toolCalls` from the hook

---

## 3. Tool Call UI Component (`ToolCallCard.tsx`)

### Visual Design (matches reference screenshot)

- Collapsible card with rounded corners, light gray background (`bg-gray-50`)
- Left icon: green checkmark (success), spinner (calling), red X (error)
- Tool display name + short summary, truncated with ellipsis
- Chevron on right to expand/collapse
- Collapsed: single line — icon + name + summary
- Expanded: full summary text visible

### States

| State    | Icon              | Text                              |
|----------|-------------------|-----------------------------------|
| calling  | Animated spinner  | "ToolName" + "Running..."         |
| success  | Green checkmark   | "ToolName: summary text"          |
| error    | Red X circle      | "ToolName: error description"     |

### Placement

Tool call cards render above the assistant's text response in the MessageBubble. During streaming, they appear in real-time as tool calls happen. After streaming, they're persisted in message metadata and rendered from saved data.

---

## 4. Rich Generative UI Components

### Marker Format

The AI emits structured data blocks within its response text:

```
Here's your project summary:

:::component{type="task_table"}
[{"name":"Fix login bug","status":"IN_PROGRESS","priority":"HIGH","dueDate":"2026-02-15","assignee":"John"}]
:::

The most urgent item is the login bug.
```

### Component Types

| Type              | Renders                                           | Data Shape                    |
|-------------------|---------------------------------------------------|-------------------------------|
| `task_table`      | Table with Name, Status badge, Priority, Due Date, Assignee | Array of task objects   |
| `task_card`       | Single task detail card                           | Single task object            |
| `calendar_events` | List of event cards with time, title, attendees   | Array of event objects        |
| `email_summary`   | Email cards with from, subject, snippet, date     | Array of email objects        |
| `meeting_summary` | Meeting card with summary, action items checklist | Single meeting object         |
| `social_post`     | Social media post preview                         | Single post object            |

### Frontend Parsing (`GenerativeUIRenderer.tsx`)

Splits message content on `:::component{type="..."}` markers:

1. Text before marker -> render as markdown
2. Component marker -> parse type + JSON data -> render matching React component
3. Text after marker -> render as markdown
4. Supports multiple components in one message

### Component Design Principles

- Clean, card-based layouts with subtle borders and shadows
- Status badges with semantic colors (green/yellow/red/blue)
- Responsive — stack on mobile, table on desktop
- Consistent with existing AYA UI palette (gray-50 backgrounds, blue-600 accents)
- Accessible: proper ARIA labels, keyboard navigation

---

## 5. System Prompt Improvements

### Critical Behavioral Fix

Add explicit instructions to stop the AI from narrating tool calls:

```
## Tool Execution Behavior

CRITICAL: When you need to use tools, JUST USE THEM SILENTLY. Do NOT narrate what you're about to do.

BAD: "I'll fetch your tasks from ClickUp to give you an overview. Now let me fetch all your tasks..."
GOOD: [silently calls tools, then presents results]

- Do NOT say "Let me fetch...", "I'll look up...", "Now let me process..."
- Call tools directly and present results with rich formatting
- If multiple tool calls are needed, make them without narrating each step
- Only speak to the user AFTER you have the data to present
```

### Generative UI Instructions

Add component block format documentation to the system prompt so the AI knows when and how to emit rich components.

---

## 6. File Manifest

### New Files

| File | Purpose |
|------|---------|
| `components/ai-chat/ToolCallCard.tsx` | Tool call indicator card with states |
| `components/ai-chat/GenerativeUIRenderer.tsx` | Parser/renderer for component blocks in messages |
| `components/ai-chat/generative-ui/TaskTable.tsx` | Task table/list component |
| `components/ai-chat/generative-ui/CalendarEventCard.tsx` | Calendar event cards |
| `components/ai-chat/generative-ui/EmailSummaryCard.tsx` | Email summary cards |
| `components/ai-chat/generative-ui/MeetingSummaryCard.tsx` | Meeting summary card |
| `components/ai-chat/generative-ui/SocialPostCard.tsx` | Social media post card |
| `components/ai-chat/generative-ui/index.ts` | Barrel exports |
| `lib/tool-display-names.ts` | Tool name mapping + result summarizer |

### Modified Files

| File | Changes |
|------|---------|
| `app/api/ai-chat/stream/route.ts` | fullStream, tool events, system prompt, maxSteps |
| `hooks/useStreamingChat.ts` | toolCalls state, parse new SSE types |
| `components/ai-chat/MessageBubble.tsx` | Render ToolCallCards + GenerativeUIRenderer |
| `components/ai-chat/StreamingMessage.tsx` | Support generative UI blocks during streaming |
| `app/(app)/ai-chat/page.tsx` | Pass toolCalls to MessageBubble |
| `components/ai-chat/index.ts` | Export new components |

---

## 7. Data Flow

```
User sends message
    |
    v
POST /api/ai-chat/stream
    |
    v
streamText() with fullStream
    |
    +-- text-delta --> SSE: {"type":"text","content":"..."}
    |
    +-- tool-call --> SSE: {"type":"tool_call_start","toolCallId":"...","toolName":"...","displayName":"..."}
    |                   (tool executes on server)
    +-- tool-result --> SSE: {"type":"tool_call_result","toolCallId":"...","status":"success","summary":"..."}
    |
    +-- text-delta --> SSE: {"type":"text","content":":::component{type=\"task_table\"}\n[...]"}
    |
    +-- finish --> SSE: {"done":true,"toolCalls":[...]}
    |
    v
Frontend useStreamingChat
    |
    +-- Updates toolCalls[] state (for ToolCallCards)
    +-- Updates streamedText (for message content)
    |
    v
MessageBubble renders:
    1. ToolCallCards (above message)
    2. GenerativeUIRenderer (splits text into markdown + components)
    3. ConnectIntegration cards (if any)
```
