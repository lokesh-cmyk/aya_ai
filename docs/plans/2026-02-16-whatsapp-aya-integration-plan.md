# WhatsApp AYA AI Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to interact with AYA AI via WhatsApp using WAHA, including full tool access, multilingual support, and daily standup digest with voice notes.

**Architecture:** Hybrid webhook processing — simple messages (greetings, web search, weather) processed directly, complex messages (Slack, email, calendar, tasks) queued via Inngest. WAHA as WhatsApp provider, OpenAI TTS for voice notes, Mem0 for memory.

**Tech Stack:** Next.js 16, Prisma 7, WAHA REST API, Vercel AI SDK, Anthropic Claude, Composio, Mem0, OpenAI TTS, Inngest

**Design Doc:** `docs/plans/2026-02-16-whatsapp-aya-integration-design.md`

---

## Task 1: Database Schema — Add WhatsApp fields and models

**Files:**
- Modify: `prisma/schema.prisma` (lines 42-91 for User model, add new models after line 751)

**Step 1: Add WhatsApp fields to User model**

In `prisma/schema.prisma`, add these fields to the `User` model (after line 56, before the relations):

```prisma
  // WhatsApp integration
  whatsappPhone         String?   @unique
  whatsappLinkedAt      DateTime?
  whatsappDigestEnabled Boolean   @default(true)
```

Also add a relation inside the User model (after the `signalDismissals` relation):

```prisma
  // WhatsApp relations
  whatsappConversations WhatsAppConversation[]
```

**Step 2: Add WhatsAppConversation and WhatsAppMessage models**

Add after the last model (line 751, after `TaskCommentReaction`):

```prisma
// ============================================
// WhatsApp Integration
// ============================================

model WhatsAppConversation {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  isActive          Boolean  @default(true)
  preferredLanguage String?  @default("en")
  metadata          Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  messages          WhatsAppMessage[]

  @@index([userId])
  @@index([isActive])
}

model WhatsAppMessage {
  id             String   @id @default(cuid())
  conversationId String
  conversation   WhatsAppConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String   // "user" | "assistant"
  content        String
  wahaMessageId  String?  @unique
  metadata       Json?
  createdAt      DateTime @default(now())

  @@index([conversationId])
  @@index([wahaMessageId])
}
```

**Step 3: Run Prisma migration**

Run: `npx prisma migrate dev --name add-whatsapp-integration`
Expected: Migration created and applied successfully.

**Step 4: Verify schema**

Run: `npx prisma generate`
Expected: Prisma Client generated successfully.

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(whatsapp): add WhatsApp fields to User model and WhatsApp conversation/message models"
```

---

## Task 2: WAHA API Client

**Files:**
- Create: `lib/integrations/waha.ts`

**Step 1: Create the WAHA client**

Create `lib/integrations/waha.ts`. This follows the same pattern as `lib/integrations/twilio.ts` (env-based config, exported functions):

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */

const WAHA_API_URL = process.env.WAHA_API_URL || "http://localhost:3000";
const WAHA_API_KEY = process.env.WAHA_API_KEY || "";
const WAHA_SESSION = process.env.WAHA_SESSION_NAME || "default";

/**
 * Base fetch wrapper for WAHA API calls
 */
async function wahaFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${WAHA_API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": WAHA_API_KEY,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "Unknown error");
    throw new Error(`WAHA API error ${res.status}: ${errorBody}`);
  }

  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

/**
 * Format phone number to WhatsApp chat ID
 * Strips +, spaces, dashes. Appends @c.us if not present.
 */
export function toChatId(phone: string): string {
  const cleaned = phone.replace(/[+\s\-()]/g, "");
  if (cleaned.includes("@")) return cleaned;
  return `${cleaned}@c.us`;
}

/**
 * Extract phone number from chat ID
 */
export function fromChatId(chatId: string): string {
  return chatId.replace("@c.us", "").replace("@s.whatsapp.net", "");
}

// ============================================
// Messaging
// ============================================

export async function sendText(
  chatId: string,
  text: string,
  session: string = WAHA_SESSION
): Promise<any> {
  return wahaFetch("/api/sendText", {
    method: "POST",
    body: JSON.stringify({
      chatId,
      text,
      session,
    }),
  });
}

export async function sendVoice(
  chatId: string,
  file: { url?: string; data?: string; mimetype?: string },
  session: string = WAHA_SESSION
): Promise<any> {
  return wahaFetch("/api/sendVoice", {
    method: "POST",
    body: JSON.stringify({
      chatId,
      file,
      session,
    }),
  });
}

export async function sendImage(
  chatId: string,
  file: { url?: string; data?: string; mimetype?: string },
  caption?: string,
  session: string = WAHA_SESSION
): Promise<any> {
  return wahaFetch("/api/sendImage", {
    method: "POST",
    body: JSON.stringify({
      chatId,
      file,
      caption,
      session,
    }),
  });
}

export async function sendFile(
  chatId: string,
  file: { url?: string; data?: string; mimetype?: string; filename?: string },
  caption?: string,
  session: string = WAHA_SESSION
): Promise<any> {
  return wahaFetch("/api/sendFile", {
    method: "POST",
    body: JSON.stringify({
      chatId,
      file,
      caption,
      session,
    }),
  });
}

// ============================================
// Typing Indicators & Read Receipts
// ============================================

export async function startTyping(
  chatId: string,
  session: string = WAHA_SESSION
): Promise<void> {
  await wahaFetch("/api/startTyping", {
    method: "POST",
    body: JSON.stringify({ chatId, session }),
  });
}

export async function stopTyping(
  chatId: string,
  session: string = WAHA_SESSION
): Promise<void> {
  await wahaFetch("/api/stopTyping", {
    method: "POST",
    body: JSON.stringify({ chatId, session }),
  });
}

export async function sendSeen(
  chatId: string,
  messageId: string,
  session: string = WAHA_SESSION
): Promise<void> {
  await wahaFetch("/api/sendSeen", {
    method: "POST",
    body: JSON.stringify({ chatId, messageId, session }),
  });
}

// ============================================
// Contacts
// ============================================

export async function checkNumberStatus(
  phone: string,
  session: string = WAHA_SESSION
): Promise<{ numberExists: boolean }> {
  const chatId = toChatId(phone);
  return wahaFetch(
    `/api/contacts/check-exists?phone=${chatId}&session=${session}`
  );
}

// ============================================
// Media Conversion
// ============================================

export async function convertVoice(
  audioBase64: string,
  mimetype: string = "audio/mp3",
  session: string = WAHA_SESSION
): Promise<{ data: string; mimetype: string }> {
  return wahaFetch(`/api/${session}/media/convert/voice`, {
    method: "POST",
    body: JSON.stringify({
      file: {
        data: audioBase64,
        mimetype,
      },
    }),
  });
}

// ============================================
// Session Management
// ============================================

export async function getSessionStatus(
  session: string = WAHA_SESSION
): Promise<any> {
  return wahaFetch(`/api/sessions/${session}`);
}

export async function restartSession(
  session: string = WAHA_SESSION
): Promise<any> {
  return wahaFetch(`/api/sessions/${session}/restart`, { method: "POST" });
}

export async function createSession(
  name: string,
  config: any = {}
): Promise<any> {
  return wahaFetch("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ name, config }),
  });
}

/**
 * Configure webhook for a WAHA session
 */
export async function configureWebhook(
  webhookUrl: string,
  secret?: string,
  session: string = WAHA_SESSION
): Promise<any> {
  const webhookConfig: any = {
    url: webhookUrl,
    events: ["message", "session.status"],
  };
  if (secret) {
    webhookConfig.hmac = { key: secret };
  }

  return wahaFetch(`/api/sessions/${session}`, {
    method: "PUT",
    body: JSON.stringify({
      config: {
        webhooks: [webhookConfig],
      },
    }),
  });
}
```

**Step 2: Commit**

```bash
git add lib/integrations/waha.ts
git commit -m "feat(whatsapp): add WAHA API client library"
```

---

## Task 3: WhatsApp Message Formatter

**Files:**
- Create: `lib/whatsapp/formatter.ts`

**Step 1: Create the formatter**

Create `lib/whatsapp/formatter.ts`:

```typescript
/**
 * Format AI responses for WhatsApp
 *
 * Converts standard markdown to WhatsApp-compatible formatting and
 * splits long messages into multiple chunks.
 */

const MAX_MESSAGE_LENGTH = 4000; // WhatsApp limit is ~65k, but readability drops after this

/**
 * Convert markdown to WhatsApp-compatible formatting
 */
export function formatForWhatsApp(text: string): string {
  let formatted = text;

  // Remove component blocks (:::component{type="..."} ... :::) — not supported on WhatsApp
  formatted = formatted.replace(
    /:::component\{type="[^"]*"\}\n[\s\S]*?\n:::/g,
    ""
  );

  // Remove [CONNECT_ACTION:...] markers
  formatted = formatted.replace(/\[CONNECT_ACTION:[^\]]+\]/g, "");

  // Convert ## headers to *bold* with line breaks
  formatted = formatted.replace(/^###?\s+(.+)$/gm, "\n*$1*\n");
  formatted = formatted.replace(/^#\s+(.+)$/gm, "\n*$1*\n");

  // Convert markdown bold **text** to WhatsApp bold *text*
  // (careful not to double-convert already single-star text)
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, "*$1*");

  // Convert markdown italic (underscore) — WhatsApp uses same syntax
  // __text__ → _text_
  formatted = formatted.replace(/__(.+?)__/g, "_$1_");

  // Convert markdown tables to lists
  formatted = convertTablesToLists(formatted);

  // Clean up excessive newlines
  formatted = formatted.replace(/\n{4,}/g, "\n\n\n");

  return formatted.trim();
}

/**
 * Convert markdown tables to numbered lists
 */
function convertTablesToLists(text: string): string {
  const tableRegex = /\|(.+)\|\n\|[-|\s]+\|\n((?:\|.+\|\n?)+)/g;

  return text.replace(tableRegex, (_match, headerRow, bodyRows) => {
    const headers = headerRow
      .split("|")
      .map((h: string) => h.trim())
      .filter(Boolean);

    const rows = bodyRows
      .trim()
      .split("\n")
      .map((row: string) =>
        row
          .split("|")
          .map((c: string) => c.trim())
          .filter(Boolean)
      );

    let result = "";
    rows.forEach((row: string[], i: number) => {
      result += `${i + 1}. `;
      row.forEach((cell: string, j: number) => {
        if (headers[j]) {
          result += `*${headers[j]}:* ${cell}  `;
        }
      });
      result += "\n";
    });

    return result;
  });
}

/**
 * Split a long message into multiple WhatsApp-friendly chunks
 * Splits at paragraph boundaries to maintain readability
 */
export function splitMessage(text: string): string[] {
  if (text.length <= MAX_MESSAGE_LENGTH) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split("\n\n");
  let current = "";

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length + 2 > MAX_MESSAGE_LENGTH) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      // If single paragraph exceeds limit, split by sentences
      if (paragraph.length > MAX_MESSAGE_LENGTH) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        for (const sentence of sentences) {
          if (current.length + sentence.length > MAX_MESSAGE_LENGTH) {
            if (current) chunks.push(current.trim());
            current = sentence;
          } else {
            current += sentence;
          }
        }
      } else {
        current = paragraph;
      }
    } else {
      current += (current ? "\n\n" : "") + paragraph;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}
```

**Step 2: Commit**

```bash
git add lib/whatsapp/formatter.ts
git commit -m "feat(whatsapp): add message formatter for WhatsApp-compatible output"
```

---

## Task 4: Intent Classifier

**Files:**
- Create: `lib/whatsapp/classifier.ts`

**Step 1: Create the intent classifier**

Create `lib/whatsapp/classifier.ts`:

```typescript
/**
 * Classify incoming WhatsApp messages as "simple" or "complex"
 *
 * Simple: processed directly in webhook (greetings, web search, weather, general Q&A)
 * Complex: queued via Inngest (Slack, email, calendar, tasks, project stats — anything needing Composio tools)
 */

// Keywords that indicate the message needs integrated service access
const COMPLEX_KEYWORDS = [
  // Slack
  "slack", "dm", "dms", "direct message", "channel",
  // Email
  "email", "emails", "inbox", "mail", "mails", "gmail", "outlook",
  // Calendar
  "calendar", "meeting", "meetings", "schedule", "event", "events", "appointment",
  // Tasks / Projects
  "task", "tasks", "project", "projects", "clickup", "sprint", "deadline",
  "todo", "to-do", "to do", "backlog", "roadmap",
  // CRM
  "contact", "contacts", "lead", "leads", "crm",
  // Analytics
  "stats", "statistics", "analytics", "report", "dashboard", "insights",
  // Instagram / LinkedIn
  "instagram", "linkedin", "social media", "post", "posts",
  // Meetings
  "transcript", "recording", "action items", "standup",
];

// Patterns that are definitely simple regardless of keywords
const SIMPLE_PATTERNS = [
  /^(hi|hello|hey|hola|namaste|bonjour|hallo|ciao|ola)/i,
  /^(good\s*(morning|afternoon|evening|night))/i,
  /^(thanks|thank you|thx)/i,
  /^(bye|goodbye|see you|ttyl)/i,
  /^(ok|okay|sure|got it|alright)/i,
  // Digest opt-in/opt-out
  /\b(opt\s*out|opt\s*in|stop|resume|pause|disable|enable)\b.*\b(digest|standup|daily|morning)\b/i,
  /\b(digest|standup|daily|morning)\b.*\b(opt\s*out|opt\s*in|stop|resume|pause|disable|enable)\b/i,
];

export type MessageIntent = "simple" | "complex";

/**
 * Classify a message intent using keyword heuristics.
 * Fast path — no LLM call needed for most messages.
 *
 * Returns "simple" for general chat, web search, weather, greetings.
 * Returns "complex" for anything needing integrated service access.
 */
export function classifyIntent(message: string): MessageIntent {
  const lower = message.toLowerCase().trim();

  // Check simple patterns first (greetings, confirmations, digest opt-out)
  for (const pattern of SIMPLE_PATTERNS) {
    if (pattern.test(lower)) {
      return "simple";
    }
  }

  // Check for complex keywords
  for (const keyword of COMPLEX_KEYWORDS) {
    if (lower.includes(keyword)) {
      return "complex";
    }
  }

  // Default: simple (general chat, web search, weather, etc.)
  return "simple";
}

/**
 * Check if a message is a digest opt-out/opt-in request
 */
export function isDigestToggle(message: string): { isToggle: boolean; enable: boolean } {
  const lower = message.toLowerCase().trim();

  const optOutPatterns = [
    /\b(stop|disable|pause|opt\s*out|turn\s*off|no\s*more)\b.*\b(digest|standup|daily|morning)\b/i,
    /\b(digest|standup|daily|morning)\b.*\b(stop|disable|pause|opt\s*out|turn\s*off|no\s*more)\b/i,
    /\bdon'?t\s*send\b.*\b(digest|standup|daily|morning)\b/i,
  ];

  const optInPatterns = [
    /\b(start|enable|resume|opt\s*in|turn\s*on)\b.*\b(digest|standup|daily|morning)\b/i,
    /\b(digest|standup|daily|morning)\b.*\b(start|enable|resume|opt\s*in|turn\s*on)\b/i,
  ];

  for (const pattern of optOutPatterns) {
    if (pattern.test(lower)) return { isToggle: true, enable: false };
  }
  for (const pattern of optInPatterns) {
    if (pattern.test(lower)) return { isToggle: true, enable: true };
  }

  return { isToggle: false, enable: false };
}
```

**Step 2: Commit**

```bash
git add lib/whatsapp/classifier.ts
git commit -m "feat(whatsapp): add intent classifier for simple vs complex message routing"
```

---

## Task 5: User Identification & Linking

**Files:**
- Create: `lib/whatsapp/user-linker.ts`

**Step 1: Create the user linker**

Create `lib/whatsapp/user-linker.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export type LinkResult =
  | { status: "linked"; userId: string; userName: string | null }
  | { status: "awaiting_email"; message: string }
  | { status: "not_found"; message: string }
  | { status: "email_linked"; userId: string; userName: string | null };

/**
 * Look up a user by their WhatsApp phone number.
 * Returns the user if found, or null if unknown.
 */
export async function findUserByPhone(phone: string) {
  return prisma.user.findUnique({
    where: { whatsappPhone: phone },
    select: {
      id: true,
      name: true,
      email: true,
      teamId: true,
      timezone: true,
      whatsappDigestEnabled: true,
    },
  });
}

/**
 * Attempt to link a phone number to a user via email.
 * Returns the link result.
 */
export async function linkPhoneByEmail(
  phone: string,
  email: string
): Promise<LinkResult> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, name: true, whatsappPhone: true },
  });

  if (!user) {
    return {
      status: "not_found",
      message:
        "I couldn't find an account with that email. Please sign up first and then message me again!",
    };
  }

  if (user.whatsappPhone && user.whatsappPhone !== phone) {
    return {
      status: "not_found",
      message:
        "That account is already linked to a different WhatsApp number. Please contact support if you need to change it.",
    };
  }

  // Link the phone number
  await prisma.user.update({
    where: { id: user.id },
    data: {
      whatsappPhone: phone,
      whatsappLinkedAt: new Date(),
      whatsappDigestEnabled: true,
    },
  });

  return {
    status: "email_linked",
    userId: user.id,
    userName: user.name,
  };
}

/**
 * Check if a conversation is in linking flow (awaiting email)
 */
export function isInLinkingFlow(metadata: any): boolean {
  return metadata?.linkingFlow === true && metadata?.awaitingEmail === true;
}

/**
 * Extract email from a message (simple regex)
 */
export function extractEmail(message: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = message.match(emailRegex);
  return match ? match[0].toLowerCase() : null;
}
```

**Step 2: Commit**

```bash
git add lib/whatsapp/user-linker.ts
git commit -m "feat(whatsapp): add user identification and phone-to-email linking"
```

---

## Task 6: Voice Note Generation

**Files:**
- Create: `lib/whatsapp/voice.ts`

**Step 1: Create the TTS voice note generator**

Create `lib/whatsapp/voice.ts`:

```typescript
import OpenAI from "openai";
import { convertVoice } from "@/lib/integrations/waha";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "tts-1";
const TTS_VOICE = (process.env.OPENAI_TTS_VOICE || "nova") as
  | "alloy"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "shimmer";

/**
 * Generate a voice note from text using OpenAI TTS.
 * Returns base64-encoded OGG/Opus audio ready for WAHA sendVoice.
 */
export async function generateVoiceNote(text: string): Promise<{
  data: string;
  mimetype: string;
}> {
  // Generate MP3 via OpenAI TTS
  const mp3Response = await openai.audio.speech.create({
    model: TTS_MODEL,
    voice: TTS_VOICE,
    input: text,
    response_format: "mp3",
  });

  const mp3Buffer = Buffer.from(await mp3Response.arrayBuffer());
  const mp3Base64 = mp3Buffer.toString("base64");

  // Convert MP3 to OGG/Opus via WAHA's built-in converter
  try {
    const converted = await convertVoice(mp3Base64, "audio/mp3");
    return {
      data: converted.data,
      mimetype: converted.mimetype || "audio/ogg; codecs=opus",
    };
  } catch (error) {
    // Fallback: send MP3 directly (WAHA may accept it)
    console.warn("[voice] WAHA conversion failed, sending MP3 directly:", error);
    return {
      data: mp3Base64,
      mimetype: "audio/mp3",
    };
  }
}

/**
 * Condense a digest into a natural spoken summary suitable for TTS.
 * Uses Claude to rewrite structured data as conversational speech.
 */
export async function generateSpeechScript(
  digestText: string,
  userName: string,
  language: string = "en"
): Promise<string> {
  const { generateText } = await import("ai");
  const { anthropic } = await import("@ai-sdk/anthropic");

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: `You are a friendly AI assistant converting a daily digest into a natural spoken summary for a voice note. Keep it under 60 seconds when spoken (~150 words). Be warm, conversational, and highlight the most important items. Respond in ${language === "en" ? "English" : `the language with code: ${language}`}. Do NOT include any markdown formatting.`,
    prompt: `Convert this daily digest for ${userName} into a spoken summary:\n\n${digestText}`,
  });

  return text;
}
```

**Step 2: Commit**

```bash
git add lib/whatsapp/voice.ts
git commit -m "feat(whatsapp): add OpenAI TTS voice note generation with WAHA conversion"
```

---

## Task 7: Core WhatsApp Message Processor

This is the heart of the integration. It reuses the same AI logic as `app/api/ai-chat/stream/route.ts` (lines 264-410) but adapted for non-streaming WhatsApp responses.

**Files:**
- Create: `lib/whatsapp/processor.ts`

**Step 1: Create the processor**

Create `lib/whatsapp/processor.ts`:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { prisma } from "@/lib/prisma";
import {
  searchMemories,
  storeMemoryAsync,
  isMem0Configured,
  type Memory,
} from "@/lib/mem0";
import { getComposioSessionTools } from "@/lib/composio-tools";
import { formatForWhatsApp, splitMessage } from "./formatter";
import { isDigestToggle } from "./classifier";
import {
  sendText,
  startTyping,
  stopTyping,
  sendSeen,
  toChatId,
} from "@/lib/integrations/waha";

const CONVERSATION_TIMEOUT_HOURS = 24;
const MAX_HISTORY_MESSAGES = 20;

interface ProcessResult {
  messages: string[];
  conversationId: string;
}

interface UserContext {
  id: string;
  name: string | null;
  email: string;
  teamId: string | null;
  timezone: string | null;
  whatsappDigestEnabled: boolean;
}

/**
 * Process a WhatsApp message from an identified user.
 * Handles conversation management, AI invocation, and response formatting.
 */
export async function processMessage(
  user: UserContext,
  phone: string,
  messageText: string,
  wahaMessageId: string | null,
  includeTools: boolean = false
): Promise<ProcessResult> {
  const chatId = toChatId(phone);

  // Send seen receipt
  if (wahaMessageId) {
    await sendSeen(chatId, wahaMessageId).catch(() => {});
  }

  // Show typing indicator
  await startTyping(chatId).catch(() => {});

  try {
    // Check for digest opt-in/opt-out
    const digestToggle = isDigestToggle(messageText);
    if (digestToggle.isToggle) {
      return await handleDigestToggle(user, phone, digestToggle.enable);
    }

    // Get or create active conversation
    const conversation = await getOrCreateConversation(user.id);

    // Deduplicate by wahaMessageId
    if (wahaMessageId) {
      const existing = await prisma.whatsAppMessage.findUnique({
        where: { wahaMessageId },
      });
      if (existing) {
        return { messages: [], conversationId: conversation.id };
      }
    }

    // Store user message
    await prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: messageText,
        wahaMessageId,
      },
    });

    // Load conversation history
    const history = await prisma.whatsAppMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: MAX_HISTORY_MESSAGES,
    });

    // Build AI context (same as web chat — see ai-chat/stream/route.ts:264-378)
    const userData = await loadUserContext(user.id, user.teamId);

    // Load tools if complex path
    let tools: any = {};
    if (includeTools) {
      try {
        const sessionTools = await getComposioSessionTools(user.id);
        tools = sessionTools.tools;
      } catch (e) {
        console.warn("[whatsapp] Failed to load Composio tools:", e);
      }
    }

    // Load memories
    let memories: Memory[] = [];
    if (isMem0Configured()) {
      try {
        memories = await searchMemories(user.id, messageText, {
          top_k: 5,
          threshold: 0.3,
        });
      } catch (e) {
        console.warn("[whatsapp] Failed to load memories:", e);
      }
    }

    // Build system prompt
    const systemPrompt = buildWhatsAppSystemPrompt(userData, memories, user);

    // Build messages array for Claude
    const messages = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Generate AI response (non-streaming for WhatsApp)
    const hasTools = Object.keys(tools).length > 0;
    const result = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: systemPrompt,
      messages,
      ...(hasTools
        ? {
            tools,
            maxSteps: 5,
          }
        : {}),
    });

    const responseText = result.text || "I couldn't generate a response. Please try again.";

    // Format for WhatsApp and split if needed
    const formatted = formatForWhatsApp(responseText);
    const chunks = splitMessage(formatted);

    // Store assistant response
    await prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: responseText,
        metadata: {
          toolCalls: result.toolCalls?.map((tc) => ({
            name: tc.toolName,
            args: tc.args,
          })),
          model: "claude-sonnet-4-5-20250929",
          includeTools,
        },
      },
    });

    // Update preferred language (detect from user message)
    await detectAndUpdateLanguage(conversation.id, messageText);

    // Store memory async (fire-and-forget, same as web chat)
    if (isMem0Configured()) {
      storeMemoryAsync(user.id, [
        { role: "user", content: messageText },
        { role: "assistant", content: responseText },
      ]).catch(() => {});
    }

    return { messages: chunks, conversationId: conversation.id };
  } finally {
    await stopTyping(chatId).catch(() => {});
  }
}

/**
 * Handle digest opt-in/opt-out
 */
async function handleDigestToggle(
  user: UserContext,
  phone: string,
  enable: boolean
): Promise<ProcessResult> {
  await prisma.user.update({
    where: { id: user.id },
    data: { whatsappDigestEnabled: enable },
  });

  const conversation = await getOrCreateConversation(user.id);
  const message = enable
    ? "Daily standup digest has been *turned on*! You'll receive it every morning at 8 AM your time."
    : "Daily standup digest has been *paused*. You can turn it back on anytime by asking me!";

  return { messages: [message], conversationId: conversation.id };
}

/**
 * Get or create an active conversation for a user.
 * Resets conversation if last message was >24 hours ago.
 */
async function getOrCreateConversation(userId: string) {
  const existing = await prisma.whatsAppConversation.findFirst({
    where: { userId, isActive: true },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (existing) {
    const lastMessage = existing.messages[0];
    if (lastMessage) {
      const hoursSinceLastMessage =
        (Date.now() - lastMessage.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastMessage > CONVERSATION_TIMEOUT_HOURS) {
        // Deactivate old conversation
        await prisma.whatsAppConversation.update({
          where: { id: existing.id },
          data: { isActive: false },
        });
        // Create new one
        return prisma.whatsAppConversation.create({
          data: { userId, isActive: true },
          include: { messages: true },
        });
      }
    }
    return existing;
  }

  return prisma.whatsAppConversation.create({
    data: { userId, isActive: true },
    include: { messages: true },
  });
}

/**
 * Load full user context for AI (mirrors ai-chat/stream/route.ts:264-378)
 */
async function loadUserContext(userId: string, teamId: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      team: {
        include: {
          spaces: {
            include: {
              taskLists: {
                include: {
                  tasks: {
                    take: 10,
                    orderBy: { dueDate: "asc" },
                    include: {
                      status: true,
                      assignee: { select: { name: true, email: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const recentEmails = await prisma.message.findMany({
    where: {
      OR: [
        { userId },
        ...(teamId ? [{ contact: { teamId } }] : []),
      ],
      channel: "EMAIL",
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { contact: true },
  });

  const recentMeetings = await prisma.meeting.findMany({
    where: {
      OR: [{ userId }, ...(teamId ? [{ teamId }] : [])],
    },
    orderBy: { scheduledStart: "desc" },
    take: 10,
    include: {
      insights: {
        where: { type: { in: ["summary", "action_items", "key_topics"] } },
      },
      participants: { select: { name: true } },
    },
  });

  return {
    user: {
      name: user?.name,
      email: user?.email,
      team: user?.team?.name,
    },
    projects:
      user?.team?.spaces?.map((space) => ({
        name: space.name,
        description: space.description,
        tasks: space.taskLists.flatMap((list) =>
          list.tasks
            .filter((task) => {
              const status = task.status as any;
              if (status?.name === "CLOSED") {
                return task.dueDate && new Date(task.dueDate) >= new Date();
              }
              return true;
            })
            .map((task) => ({
              name: task.name,
              description: task.description,
              priority: task.priority,
              status: (task.status as any)?.name || "OPEN",
              dueDate: task.dueDate,
              assignee: task.assignee?.name || null,
            }))
        ),
      })) || [],
    recentEmails: recentEmails.map((m) => {
      const metadata = m.metadata as any;
      return {
        from: m.contact?.email || "Unknown",
        subject:
          metadata?.subject || m.content?.substring(0, 50) || "No subject",
        snippet: m.content?.substring(0, 100) || "",
        date: m.createdAt,
      };
    }),
    meetings: recentMeetings.map((meeting) => {
      const summaryInsight = meeting.insights.find((i) => i.type === "summary");
      const actionItemsInsight = meeting.insights.find(
        (i) => i.type === "action_items"
      );
      const keyTopicsInsight = meeting.insights.find(
        (i) => i.type === "key_topics"
      );

      let actionItems: Array<{ task: string; owner?: string }> = [];
      let keyTopics: string[] = [];
      try {
        if (actionItemsInsight)
          actionItems = JSON.parse(actionItemsInsight.content);
        if (keyTopicsInsight)
          keyTopics = JSON.parse(keyTopicsInsight.content);
      } catch {}

      return {
        id: meeting.id,
        title: meeting.title,
        date: meeting.scheduledStart,
        duration: meeting.duration
          ? Math.round(meeting.duration / 60)
          : null,
        status: meeting.status,
        participants: meeting.participants.map((p) => p.name),
        summary: summaryInsight?.content || null,
        actionItems,
        keyTopics,
      };
    }),
  };
}

/**
 * Build WhatsApp-specific system prompt
 */
function buildWhatsAppSystemPrompt(
  context: any,
  memories: Memory[],
  user: UserContext
): string {
  let prompt = `You are AYA, an AI assistant in the Unified Box platform. You are responding via WhatsApp.

## WhatsApp Formatting Rules
- Use *bold* for emphasis, _italic_ for secondary info
- No markdown tables — use numbered lists instead
- No code blocks longer than 3 lines — describe conversationally
- Keep responses under 500 words. Ask if they want more detail.
- Use line breaks generously for readability
- Emojis are welcome — use them naturally
- Number list items so user can reference by number (e.g., "tell me more about #2")
- For long data (many tasks, many emails), show top 5 and ask "want to see more?"

## MULTILINGUAL — CRITICAL
Always respond in the SAME LANGUAGE the user writes in.
If they write in Hindi, respond in Hindi. If Spanish, respond in Spanish.
If they mix languages (Hinglish, Spanglish), match their style naturally.

## Behavior
- Be concise — WhatsApp is a chat, not an essay
- When executing tools, briefly say what you're doing: "Checking your calendar..."
- NEVER include [CONNECT_ACTION:...] markers or :::component{...}::: blocks — those are for the web UI only
- If the user asks to stop/start daily standup digest, confirm you've done it

## Your Capabilities
You have access to:
- User's ongoing projects and tasks
- Recent emails and messages
- Recent meetings with AI-generated summaries
- Team information
- Long-term memories about this user
- Connected integrations (Google Calendar, ClickUp, Slack, Instagram, LinkedIn)
`;

  // Add memories
  if (memories.length > 0) {
    prompt += `\n## What You Remember About This User:\n`;
    memories.forEach((m) => {
      prompt += `- ${m.memory}\n`;
    });
  }

  // Add current context
  prompt += `\n## Current Context
- User: ${context.user.name} (${context.user.email})
- Team: ${context.user.team || "No team"}
- Active Projects: ${context.projects.length}
- Recent Emails: ${context.recentEmails.length}
- Recent Meetings: ${context.meetings?.length || 0}
- Daily Digest: ${user.whatsappDigestEnabled ? "Enabled" : "Disabled"}`;

  if (context.projects.length > 0) {
    prompt += `\n\n### Projects:\n${context.projects.map((p: any) => `- ${p.name}: ${p.tasks.length} tasks`).join("\n")}`;
  }

  if (context.recentEmails.length > 0) {
    prompt += `\n\n### Recent Emails:\n${context.recentEmails.map((e: any) => `- From ${e.from}: ${e.subject}`).join("\n")}`;
  }

  if (context.meetings?.length > 0) {
    prompt += `\n\n### Recent Meetings:\n${context.meetings
      .map((m: any) => {
        let info = `- ${m.title} (${new Date(m.date).toLocaleDateString()})`;
        if (m.status === "COMPLETED" && m.summary) {
          info += `\n  Summary: ${m.summary.substring(0, 200)}`;
        }
        return info;
      })
      .join("\n")}`;
  }

  return prompt;
}

/**
 * Detect language from message and update conversation preference
 */
async function detectAndUpdateLanguage(
  conversationId: string,
  message: string
) {
  // Simple heuristic: detect script/common words
  // This is a lightweight approach — Claude handles the actual multilingual response
  let lang = "en";

  // Hindi (Devanagari)
  if (/[\u0900-\u097F]/.test(message)) lang = "hi";
  // Arabic
  else if (/[\u0600-\u06FF]/.test(message)) lang = "ar";
  // Chinese
  else if (/[\u4e00-\u9fff]/.test(message)) lang = "zh";
  // Japanese
  else if (/[\u3040-\u30ff\u31f0-\u31ff]/.test(message)) lang = "ja";
  // Korean
  else if (/[\uac00-\ud7af]/.test(message)) lang = "ko";
  // Spanish common words
  else if (/\b(hola|gracias|por favor|como|buenos|buenas)\b/i.test(message)) lang = "es";
  // French common words
  else if (/\b(bonjour|merci|s'il vous|comment|bonsoir)\b/i.test(message)) lang = "fr";
  // German common words
  else if (/\b(hallo|danke|bitte|guten|morgen|abend)\b/i.test(message)) lang = "de";
  // Portuguese common words
  else if (/\b(obrigado|obrigada|bom dia|boa tarde|como vai)\b/i.test(message)) lang = "pt";

  await prisma.whatsAppConversation.update({
    where: { id: conversationId },
    data: { preferredLanguage: lang },
  });
}
```

**Step 2: Commit**

```bash
git add lib/whatsapp/processor.ts
git commit -m "feat(whatsapp): add core message processor with AI invocation, context loading, and multilingual support"
```

---

## Task 8: Webhook Handler

**Files:**
- Create: `app/api/webhooks/waha/route.ts`

**Step 1: Create the webhook route**

Create `app/api/webhooks/waha/route.ts`:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { inngest } from "@/lib/inngest/client";
import {
  sendText,
  toChatId,
  fromChatId,
} from "@/lib/integrations/waha";
import {
  findUserByPhone,
  linkPhoneByEmail,
  isInLinkingFlow,
  extractEmail,
} from "@/lib/whatsapp/user-linker";
import { classifyIntent } from "@/lib/whatsapp/classifier";
import { processMessage } from "@/lib/whatsapp/processor";
import { prisma } from "@/lib/prisma";

const WEBHOOK_SECRET = process.env.WAHA_WEBHOOK_SECRET;

/**
 * Verify HMAC signature from WAHA webhook
 */
function verifyHmac(body: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return !WEBHOOK_SECRET; // Skip if no secret configured
  const expected = createHmac("sha512", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  return signature === expected;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify HMAC signature
  const signature = request.headers.get("x-hmac-sha512");
  if (!verifyHmac(rawBody, signature)) {
    console.warn("[waha-webhook] Invalid HMAC signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only process incoming messages (not our own outbound)
  const event = data.event;
  if (event !== "message") {
    // Handle session.status events for monitoring
    if (event === "session.status") {
      console.log("[waha-webhook] Session status:", data.payload?.status);
    }
    return NextResponse.json({ ok: true });
  }

  const payload = data.payload;
  if (!payload || payload.fromMe) {
    // Ignore our own messages
    return NextResponse.json({ ok: true });
  }

  const chatId = payload.from;
  const messageBody = payload.body || "";
  const wahaMessageId = payload.id;

  // Only handle direct messages (not groups)
  if (chatId?.includes("@g.us")) {
    return NextResponse.json({ ok: true });
  }

  const phone = fromChatId(chatId);

  // Process asynchronously — ACK webhook immediately
  // We use waitUntil pattern to not block the response
  const processingPromise = handleIncomingMessage(
    phone,
    messageBody,
    wahaMessageId,
    payload
  );

  // In Next.js, we can't use waitUntil directly, so we handle errors
  processingPromise.catch((error) => {
    console.error("[waha-webhook] Processing error:", error);
  });

  return NextResponse.json({ ok: true });
}

async function handleIncomingMessage(
  phone: string,
  messageBody: string,
  wahaMessageId: string | null,
  payload: any
) {
  const chatId = toChatId(phone);

  // Handle voice messages — transcribe first
  let messageText = messageBody;
  if (payload.hasMedia && payload.type === "ptt") {
    // Voice note — would need transcription
    // For now, ask user to send text
    await sendText(
      chatId,
      "I received your voice note! Voice message processing is coming soon. For now, could you type your message?"
    );
    return;
  }

  // If no text content, acknowledge
  if (!messageText?.trim()) {
    if (payload.hasMedia) {
      await sendText(
        chatId,
        "I can see you sent a file! I can't process media on WhatsApp yet, but I'm working on it. Try sending a text message instead."
      );
    }
    return;
  }

  // Step 1: Identify user
  const user = await findUserByPhone(phone);

  if (!user) {
    // Check if there's an active linking flow
    await handleUnknownUser(phone, messageText);
    return;
  }

  // Step 2: Classify intent
  const intent = classifyIntent(messageText);

  if (intent === "simple") {
    // Process directly
    const result = await processMessage(
      user,
      phone,
      messageText,
      wahaMessageId,
      false // no Composio tools
    );

    // Send responses
    for (const msg of result.messages) {
      await sendText(chatId, msg);
    }
  } else {
    // Queue via Inngest for complex processing
    await sendText(chatId, "Let me look that up for you...");

    await inngest.send({
      name: "whatsapp/process-complex-message",
      data: {
        userId: user.id,
        phone,
        messageText,
        wahaMessageId,
        userName: user.name,
        userEmail: user.email,
        teamId: user.teamId,
        timezone: user.timezone,
        whatsappDigestEnabled: user.whatsappDigestEnabled,
      },
    });
  }
}

/**
 * Handle messages from unknown (unlinked) phone numbers.
 * Manages the email-based linking flow.
 */
async function handleUnknownUser(phone: string, messageText: string) {
  const chatId = toChatId(phone);

  // Check for existing linking conversation (stored in a temporary WhatsApp conversation with no userId)
  // We use a simple approach: check if the message looks like an email
  const email = extractEmail(messageText);

  if (email) {
    // User sent an email — attempt to link
    const result = await linkPhoneByEmail(phone, email);

    if (result.status === "email_linked") {
      const greeting = result.userName
        ? `Linked! Welcome, *${result.userName}*! How can I help you today?`
        : "Linked! Welcome! How can I help you today?";
      await sendText(chatId, greeting);
    } else {
      await sendText(chatId, result.message);
    }
  } else {
    // First contact or non-email message — ask for email
    await sendText(
      chatId,
      "Hey there! I'm *AYA*, your AI assistant from Unified Box.\n\nI don't recognize this number yet. Could you share the *email address* you used to sign up on AYA? I'll link your WhatsApp to your account."
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/webhooks/waha/route.ts
git commit -m "feat(whatsapp): add WAHA webhook handler with user identification and hybrid routing"
```

---

## Task 9: Inngest Function — Complex Message Processing

**Files:**
- Create: `lib/inngest/functions/whatsapp-message.ts`

**Step 1: Create the Inngest function**

Create `lib/inngest/functions/whatsapp-message.ts`:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";
import { processMessage } from "@/lib/whatsapp/processor";
import { sendText, toChatId, startTyping, stopTyping } from "@/lib/integrations/waha";

/**
 * Process complex WhatsApp messages that need Composio tools.
 * Triggered by the webhook handler when intent is "complex".
 */
export const processComplexWhatsAppMessage = inngest.createFunction(
  {
    id: "process-complex-whatsapp-message",
    concurrency: [
      {
        key: "event.data.userId",
        limit: 1, // Process one message at a time per user
      },
    ],
    retries: 2,
  },
  { event: "whatsapp/process-complex-message" },
  async ({ event }) => {
    const {
      userId,
      phone,
      messageText,
      wahaMessageId,
      userName,
      userEmail,
      teamId,
      timezone,
      whatsappDigestEnabled,
    } = event.data;

    const chatId = toChatId(phone);

    try {
      // Show typing indicator
      await startTyping(chatId).catch(() => {});

      const result = await processMessage(
        {
          id: userId,
          name: userName,
          email: userEmail,
          teamId,
          timezone,
          whatsappDigestEnabled,
        },
        phone,
        messageText,
        wahaMessageId,
        true // include Composio tools
      );

      // Send responses
      for (const msg of result.messages) {
        await sendText(chatId, msg);
      }

      await stopTyping(chatId).catch(() => {});

      return {
        success: true,
        userId,
        conversationId: result.conversationId,
        messageCount: result.messages.length,
      };
    } catch (error: any) {
      console.error("[whatsapp-inngest] Error processing complex message:", error);

      await stopTyping(chatId).catch(() => {});
      await sendText(
        chatId,
        "Sorry, I had trouble processing that request. Could you try again?"
      ).catch(() => {});

      throw error; // Let Inngest retry
    }
  }
);
```

**Step 2: Commit**

```bash
git add lib/inngest/functions/whatsapp-message.ts
git commit -m "feat(whatsapp): add Inngest function for complex message processing with Composio tools"
```

---

## Task 10: Inngest Function — WAHA Session Health Monitor

**Files:**
- Create: `lib/inngest/functions/whatsapp-session-health.ts`

**Step 1: Create the health monitor**

Create `lib/inngest/functions/whatsapp-session-health.ts`:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";
import { getSessionStatus, restartSession } from "@/lib/integrations/waha";
import { prisma } from "@/lib/prisma";

let consecutiveFailures = 0;

/**
 * Monitor WAHA session health every 5 minutes.
 * Auto-restart on disconnect, notify admin after 3 consecutive failures.
 */
export const wahaSessionHealthCheck = inngest.createFunction(
  { id: "waha-session-health-check" },
  { cron: "*/5 * * * *" }, // Every 5 minutes
  async ({ step }) => {
    const status = await step.run("check-session", async () => {
      try {
        const session = await getSessionStatus();
        return { ok: true, status: session.status, name: session.name };
      } catch (error: any) {
        return { ok: false, status: "unreachable", error: error.message };
      }
    });

    if (status.ok && status.status === "WORKING") {
      consecutiveFailures = 0;
      return { healthy: true, status: status.status };
    }

    // Session not healthy — attempt restart
    consecutiveFailures++;

    const restartResult = await step.run("restart-session", async () => {
      try {
        await restartSession();
        return { restarted: true };
      } catch (error: any) {
        return { restarted: false, error: error.message };
      }
    });

    // After 3 consecutive failures, notify admin
    if (consecutiveFailures >= 3) {
      await step.run("notify-admin", async () => {
        // Find admin users
        const admins = await prisma.user.findMany({
          where: { role: "ADMIN" },
          select: { id: true },
        });

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              title: "WAHA WhatsApp Session Down",
              message: `WhatsApp session has been unhealthy for ${consecutiveFailures} consecutive checks. Last status: ${status.status}. Auto-restart ${restartResult.restarted ? "succeeded" : "failed"}.`,
              type: "ALERT",
            },
          });
        }
      });
    }

    return {
      healthy: false,
      status: status.status,
      consecutiveFailures,
      restarted: restartResult.restarted,
    };
  }
);
```

**Step 2: Commit**

```bash
git add lib/inngest/functions/whatsapp-session-health.ts
git commit -m "feat(whatsapp): add WAHA session health monitor with auto-restart and admin notifications"
```

---

## Task 11: Extend Daily Digest for WhatsApp Delivery

**Files:**
- Modify: `lib/inngest/functions/daily-digest.ts` (lines 105-196, the `processTeamDigest` function)

**Step 1: Add WhatsApp digest delivery to processTeamDigest**

In `lib/inngest/functions/daily-digest.ts`, add the import at the top (after line 4):

```typescript
import { sendText, sendVoice, toChatId } from "@/lib/integrations/waha";
import { generateVoiceNote, generateSpeechScript } from "@/lib/whatsapp/voice";
import { prisma as db } from "@/lib/prisma";
```

Then, after the email sending block (after line 182, before the `return` statement at line 184), add the WhatsApp digest delivery:

```typescript
    // Send WhatsApp digest to linked users
    const whatsappResults = await step.run(
      `send-whatsapp-digest-${teamId}`,
      async () => {
        const linkedUsers = team.users.filter(
          (u: any) => u.whatsappPhone && u.whatsappDigestEnabled
        );

        if (linkedUsers.length === 0) {
          return { sent: 0, skipped: "no linked users" };
        }

        const results = [];

        for (const user of linkedUsers) {
          try {
            const chatId = toChatId(user.whatsappPhone!);

            // Get user's preferred language from their last WhatsApp conversation
            const lastConversation = await db.whatsAppConversation.findFirst({
              where: { userId: user.id, isActive: true },
              select: { preferredLanguage: true },
            });
            const language = lastConversation?.preferredLanguage || "en";

            // Format digest for WhatsApp (use the text version, shorter)
            const whatsappDigest = formatWhatsAppDigest(
              digest.text,
              user.name || "there",
              teamName
            );
            await sendText(chatId, whatsappDigest);

            // Generate and send voice note
            try {
              const speechScript = await generateSpeechScript(
                digest.text,
                user.name || "there",
                language
              );
              const voiceNote = await generateVoiceNote(speechScript);
              await sendVoice(chatId, {
                data: voiceNote.data,
                mimetype: voiceNote.mimetype,
              });
              results.push({ userId: user.id, success: true, voice: true });
            } catch (voiceError: any) {
              console.error(
                `[daily-digest] Voice note failed for ${user.email}:`,
                voiceError
              );
              results.push({ userId: user.id, success: true, voice: false });
            }
          } catch (error: any) {
            console.error(
              `[daily-digest] WhatsApp digest failed for ${user.email}:`,
              error
            );
            results.push({
              userId: user.id,
              success: false,
              error: error.message,
            });
          }
        }

        return { sent: results.filter((r) => r.success).length, results };
      }
    );
```

Also add the `whatsappResults` to the return statement, and add the `formatWhatsAppDigest` helper function at the bottom of the file:

```typescript
/**
 * Format a digest email text into WhatsApp-friendly format
 */
function formatWhatsAppDigest(
  emailText: string,
  userName: string,
  teamName: string
): string {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `🌅 *Good morning, ${userName}!*

Here's your daily standup for *${today}* — _${teamName}_

${emailText.substring(0, 3000)}

_Reply with any question for details, or ask me anything!_`;
}
```

Also update the User query in `processTeamDigest` to include the new fields. In the `select` block for users (around line 139), add:

```typescript
whatsappPhone: true,
whatsappDigestEnabled: true,
```

**Step 2: Commit**

```bash
git add lib/inngest/functions/daily-digest.ts
git commit -m "feat(whatsapp): extend daily digest to send WhatsApp text + voice note to linked users"
```

---

## Task 12: Register New Inngest Functions

**Files:**
- Modify: `app/api/inngest/route.ts`

**Step 1: Add imports and register functions**

In `app/api/inngest/route.ts`, add after the existing imports (after line 19):

```typescript
import { processComplexWhatsAppMessage } from "@/lib/inngest/functions/whatsapp-message";
import { wahaSessionHealthCheck } from "@/lib/inngest/functions/whatsapp-session-health";
```

Then add to the `functions` array (inside `serve()`):

```typescript
    processComplexWhatsAppMessage,
    wahaSessionHealthCheck,
```

**Step 2: Commit**

```bash
git add app/api/inngest/route.ts
git commit -m "feat(whatsapp): register WhatsApp Inngest functions"
```

---

## Task 13: Environment Configuration

**Files:**
- Modify: `.env.example`

**Step 1: Add WAHA environment variables**

Add these to `.env.example` at the end:

```env
# WAHA (WhatsApp HTTP API)
WAHA_API_URL="https://allys-ai-waha-gsvqb.ondigitalocean.app"
WAHA_API_KEY=""
WAHA_SESSION_NAME="default"
WAHA_WEBHOOK_SECRET=""
WHATSAPP_AYA_PHONE=""

# OpenAI TTS (for WhatsApp voice notes — uses existing OPENAI_API_KEY)
OPENAI_TTS_MODEL="tts-1"
OPENAI_TTS_VOICE="nova"
```

**Step 2: Add to actual `.env` (manual — do not commit)**

The developer must manually add the actual values to their `.env` file.

**Step 3: Commit**

```bash
git add .env.example
git commit -m "feat(whatsapp): add WAHA and TTS environment variables to .env.example"
```

---

## Task 14: WAHA Session Setup Script

**Files:**
- Create: `scripts/setup-waha.ts`

**Step 1: Create a one-time setup script**

Create `scripts/setup-waha.ts`:

```typescript
/**
 * One-time setup script for WAHA WhatsApp session.
 * Run with: npx tsx scripts/setup-waha.ts
 *
 * This creates (or updates) a WAHA session with webhook configuration
 * pointing to your deployed app.
 */

const WAHA_API_URL = process.env.WAHA_API_URL || "https://allys-ai-waha-gsvqb.ondigitalocean.app";
const WAHA_API_KEY = process.env.WAHA_API_KEY || "";
const WAHA_SESSION_NAME = process.env.WAHA_SESSION_NAME || "default";
const WAHA_WEBHOOK_SECRET = process.env.WAHA_WEBHOOK_SECRET || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function setup() {
  const webhookUrl = `${APP_URL}/api/webhooks/waha`;

  console.log("🔧 Setting up WAHA session...");
  console.log(`   WAHA URL: ${WAHA_API_URL}`);
  console.log(`   Session: ${WAHA_SESSION_NAME}`);
  console.log(`   Webhook: ${webhookUrl}`);

  // Check if session exists
  try {
    const res = await fetch(`${WAHA_API_URL}/api/sessions/${WAHA_SESSION_NAME}`, {
      headers: { "X-Api-Key": WAHA_API_KEY },
    });

    if (res.ok) {
      const session = await res.json();
      console.log(`\n📱 Session "${WAHA_SESSION_NAME}" exists (status: ${session.status})`);

      // Update webhook config
      const updateRes = await fetch(`${WAHA_API_URL}/api/sessions/${WAHA_SESSION_NAME}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": WAHA_API_KEY,
        },
        body: JSON.stringify({
          config: {
            webhooks: [
              {
                url: webhookUrl,
                events: ["message", "session.status"],
                ...(WAHA_WEBHOOK_SECRET
                  ? { hmac: { key: WAHA_WEBHOOK_SECRET } }
                  : {}),
              },
            ],
          },
        }),
      });

      if (updateRes.ok) {
        console.log("✅ Webhook configured successfully!");
      } else {
        console.error("❌ Failed to update webhook:", await updateRes.text());
      }
    } else {
      // Create new session
      console.log(`\n📱 Creating session "${WAHA_SESSION_NAME}"...`);

      const createRes = await fetch(`${WAHA_API_URL}/api/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": WAHA_API_KEY,
        },
        body: JSON.stringify({
          name: WAHA_SESSION_NAME,
          config: {
            webhooks: [
              {
                url: webhookUrl,
                events: ["message", "session.status"],
                ...(WAHA_WEBHOOK_SECRET
                  ? { hmac: { key: WAHA_WEBHOOK_SECRET } }
                  : {}),
              },
            ],
          },
        }),
      });

      if (createRes.ok) {
        console.log("✅ Session created! You'll need to scan the QR code to pair.");
        console.log(`   Open: ${WAHA_API_URL}/api/${WAHA_SESSION_NAME}/auth/qr`);
      } else {
        console.error("❌ Failed to create session:", await createRes.text());
      }
    }
  } catch (error) {
    console.error("❌ Error connecting to WAHA:", error);
  }
}

setup();
```

**Step 2: Commit**

```bash
git add scripts/setup-waha.ts
git commit -m "feat(whatsapp): add WAHA session setup script"
```

---

## Task Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Database schema (User fields + WhatsApp models) | None |
| 2 | WAHA API client (`lib/integrations/waha.ts`) | None |
| 3 | WhatsApp formatter (`lib/whatsapp/formatter.ts`) | None |
| 4 | Intent classifier (`lib/whatsapp/classifier.ts`) | None |
| 5 | User linker (`lib/whatsapp/user-linker.ts`) | Task 1 |
| 6 | Voice note generation (`lib/whatsapp/voice.ts`) | Task 2 |
| 7 | Core processor (`lib/whatsapp/processor.ts`) | Tasks 1-5 |
| 8 | Webhook handler (`app/api/webhooks/waha/route.ts`) | Tasks 2, 4, 5, 7 |
| 9 | Inngest: complex message processing | Tasks 2, 7 |
| 10 | Inngest: session health monitor | Task 2 |
| 11 | Extend daily digest for WhatsApp | Tasks 2, 6 |
| 12 | Register Inngest functions | Tasks 9, 10 |
| 13 | Environment configuration | None |
| 14 | WAHA setup script | Task 2 |

**Tasks 1-4 and 13 can be done in parallel** (no dependencies between them).
**Tasks 5-6** depend on Task 1 and 2 respectively.
**Task 7** is the critical path — needs 1-5 done.
**Tasks 8-14** depend on earlier tasks as noted.
