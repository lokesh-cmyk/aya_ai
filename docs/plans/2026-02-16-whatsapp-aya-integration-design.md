# WhatsApp AYA AI Integration — Design Document

**Date:** 2026-02-16
**Status:** Approved
**Author:** Claude + Lokesh

---

## Overview

Integrate AYA AI with WhatsApp via WAHA (WhatsApp HTTP API) so users can interact with the full AYA AI brain from WhatsApp — chat, fetch project stats, read Slack DMs, get email summaries, manage tasks, and receive a daily standup digest (text + voice note) at 8 AM local time.

WAHA instance: `https://allys-ai-waha-gsvqb.ondigitalocean.app/`

---

## Key Decisions

| Decision | Choice |
|----------|--------|
| WhatsApp provider | WAHA (self-hosted WhatsApp Web API) |
| User identification | Phone lookup → email-based linking fallback |
| AI capability | Full AYA brain (Claude + Composio + Mem0) |
| Message routing | Hybrid — simple direct, complex via Inngest |
| Voice notes | OpenAI TTS → WAHA media converter |
| Webhook delivery | Direct to Next.js API with HMAC verification |
| Conversation context | Persistent per user, 24hr auto-reset |
| Daily digest | Auto-enrolled on WhatsApp link, opt out via chat |
| Digest format | Text message + voice note at 8 AM local time |
| Multilingual | Auto-detect user language, respond in same language |

---

## Architecture & Message Flow

```
WhatsApp User
     │
     ▼
  WAHA Instance (DigitalOcean)
     │  webhook POST (message, session.status events)
     ▼
  /api/webhooks/waha/route.ts
     │
     ├── 1. ACK immediately (200 OK)
     ├── 2. Verify HMAC signature
     ├── 3. Identify user (phone → User lookup, or email-based linking flow)
     ├── 4. Classify intent (simple vs complex)
     │
     ├── SIMPLE (direct) ───────────────────────┐
     │   Run AYA AI (Claude, web search,        │
     │   no Composio tools, Mem0 memory)        │
     │   → Format → WAHA sendText               │
     │                                          │
     └── COMPLEX (Inngest queue) ───────────────┤
         Fire Inngest event                     │
         "whatsapp/process-complex-message"     │
         → Send typing indicator                │
         → Run full AYA AI (Claude + Composio   │
           + Mem0 + all tools)                  │
         → Format → WAHA sendText               │
                                                │
  ◄─────────────────────────────────────────────┘

Daily Digest (8 AM per timezone):
  Inngest cron (existing, extended)
     → Generate digest text via AI
     → Send text message via WAHA
     → Generate voice note via OpenAI TTS
     → Convert to opus via WAHA media converter
     → Send voice note via WAHA sendVoice
```

### Intent Classification

Classification determines whether a message is processed directly or queued via Inngest.

**SIMPLE (direct processing):**
- Greetings, casual conversation
- Internet/web searches, weather checks
- General knowledge Q&A
- Opt-in/opt-out of digest (just a DB update)
- Conversation during user linking flow

**COMPLEX (Inngest queue):**
- Anything mentioning: slack, email, tasks, project, calendar, meeting, clickup
- Composio tool-requiring operations
- Data-heavy fetches (project stats, email summaries, Slack DMs)

**Ambiguous → defaults to COMPLEX** (safer, just slightly slower).

Classification approach: lightweight Claude Haiku call with a focused prompt, or keyword-based heuristics as a fast path before falling back to Haiku.

---

## Multilingual Support

AYA on WhatsApp supports multilingual conversations natively:

### Detection & Response Strategy

- **Auto-detect language** from user's message — Claude naturally handles this
- **Respond in the same language** the user writes in
- **System prompt addendum** instructs AYA to mirror the user's language
- **No explicit language setting needed** — if user switches language mid-conversation, AYA follows

### Implementation

The WhatsApp-specific system prompt includes:

```
MULTILINGUAL: Always respond in the same language the user is writing in.
If they write in Hindi, respond in Hindi. If they write in Spanish, respond in Spanish.
If they mix languages (e.g., Hinglish), match their style.
For the daily digest, use the language of the user's most recent conversation.
If no conversation history exists, default to English.
```

### Daily Digest Language

- Track `preferredLanguage` on WhatsAppConversation (inferred from last few messages)
- Generate digest text and voice note in that language
- OpenAI TTS supports: English, Hindi, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese, and more
- Default to English if no conversation history exists

---

## Components & Data Model

### New Files

```
lib/integrations/waha.ts                          — WAHA API client
lib/whatsapp/classifier.ts                        — Intent classifier (simple vs complex)
lib/whatsapp/processor.ts                         — Core message processor
lib/whatsapp/formatter.ts                         — AI response → WhatsApp formatting
lib/whatsapp/voice.ts                             — OpenAI TTS wrapper
lib/whatsapp/user-linker.ts                       — Phone-to-user identification & linking
app/api/webhooks/waha/route.ts                    — Webhook handler
lib/inngest/functions/whatsapp-message.ts         — Complex message Inngest processor
lib/inngest/functions/whatsapp-session-health.ts  — WAHA session health monitor
```

### Database Changes (Prisma)

```prisma
// Add to User model
model User {
  // ... existing fields
  whatsappPhone         String?   @unique
  whatsappLinkedAt      DateTime?
  whatsappDigestEnabled Boolean   @default(true)

  whatsappConversations WhatsAppConversation[]
}

model WhatsAppConversation {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  isActive          Boolean  @default(true)
  preferredLanguage String?  @default("en")  // inferred from conversation
  metadata          Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  messages          WhatsAppMessage[]

  @@index([userId])
}

model WhatsAppMessage {
  id             String   @id @default(cuid())
  conversationId String
  conversation   WhatsAppConversation @relation(fields: [conversationId], references: [id])
  role           String   // "user" | "assistant"
  content        String
  wahaMessageId  String?  @unique  // for deduplication
  metadata       Json?    // tool calls, media info, language detected, etc.
  createdAt      DateTime @default(now())

  @@index([conversationId])
  @@index([wahaMessageId])
}
```

### WAHA Client (`lib/integrations/waha.ts`)

Key methods:
- `sendText(chatId, text, session?)` — Send text message
- `sendVoice(chatId, audioBuffer, session?)` — Send voice note
- `sendImage(chatId, imageUrl, caption?, session?)` — Send image
- `sendFile(chatId, fileUrl, filename?, session?)` — Send file
- `startTyping(chatId, session?)` / `stopTyping(chatId, session?)` — Typing indicators
- `sendSeen(chatId, messageId, session?)` — Mark as read
- `checkNumberStatus(phone, session?)` — Verify WhatsApp registration
- `getSessionStatus(session?)` — Health check
- `convertVoice(audioBuffer, session?)` — Convert audio to opus format

All calls to `WAHA_API_URL` with `X-Api-Key: WAHA_API_KEY` header.

---

## User Identification & Linking Flow

```
Incoming message from phone "919876543210"
     │
     ├── DB lookup: User.whatsappPhone = "919876543210"
     │   ├── FOUND → proceed with full AYA AI
     │   └── NOT FOUND → enter linking flow
     │
     └── Linking flow (conversational):
         ├── AYA: "Hey! I don't recognize this number. What's your email on AYA?"
         │         (multilingual: responds in user's detected language)
         ├── User: "lokesh@example.com"
         ├── DB lookup: User.email = "lokesh@example.com"
         │   ├── FOUND → update User.whatsappPhone, whatsappLinkedAt, whatsappDigestEnabled=true
         │   │         → AYA: "Linked! Welcome, Lokesh. How can I help?"
         │   └── NOT FOUND → AYA: "No account found. Sign up at <app-url> first!"
         └── State: conversation metadata { "linkingFlow": true, "awaitingEmail": true }
```

---

## AI Processing

### Shared Core

The WhatsApp processor reuses the same AI logic as the web chat:
- Same Claude model (configurable, default Sonnet 4.5)
- Same Composio tool set (for complex path)
- Same Mem0 memory (search + store)
- Same user context building (projects, emails, meetings, integration status)
- Same system prompt base + WhatsApp-specific addendum

### WhatsApp System Prompt Addendum

```
You are responding via WhatsApp. Follow these rules:

FORMATTING:
- Use *bold* for emphasis, _italic_ for secondary info
- No markdown tables — use numbered lists instead
- No code blocks longer than 3 lines — describe conversationally
- Keep responses under 500 words. Ask if they want more detail.
- Use line breaks generously for readability
- Emojis are welcome — use them naturally
- Number list items so user can reference by number (e.g., "tell me more about #2")

MULTILINGUAL:
- Always respond in the same language the user writes in
- If they mix languages (Hinglish, Spanglish), match their style
- For the daily digest, use the user's preferred conversation language

BEHAVIOR:
- Be concise — WhatsApp is a chat, not an essay
- For long data (many tasks, many emails), show top 5 and ask "want to see more?"
- When executing tools, briefly say what you're doing: "Let me check your calendar..."
```

### Conversation Management

- Each user gets one active `WhatsAppConversation` at a time
- **24-hour auto-reset:** If last message was >24 hours ago, close old conversation, create new
- Last 20 messages loaded as context for Claude
- `preferredLanguage` updated based on detected language of user messages
- Mem0 memory stored asynchronously (fire-and-forget, same as web)

---

## Daily Digest via WhatsApp

### Flow

```
Existing Inngest cron (hourly) → is8AMInTimezone?
     │
     ├── generateDailyDigestEmail() (existing, unchanged)
     │   ├── sendEmail() (existing)
     │   └── sendWhatsAppDigest() (NEW)
     │       │
     │       ├── Filter: user.whatsappPhone != null AND user.whatsappDigestEnabled == true
     │       ├── Generate WhatsApp-formatted digest (shorter, punchier)
     │       │   → In user's preferredLanguage (from last WhatsAppConversation)
     │       ├── Send text message via WAHA sendText
     │       ├── Generate speech script (Claude rewrites digest as natural speech)
     │       │   → In same language
     │       ├── OpenAI TTS API (model: tts-1, voice: nova)
     │       │   → Returns MP3 buffer
     │       ├── WAHA /api/{session}/media/convert/voice → OGG/Opus
     │       └── WAHA sendVoice(chatId, oggBuffer)
```

### WhatsApp Digest Format Example

```
🌅 *Good morning, Lokesh!*

Here's your daily standup for *Feb 16, 2026*:

📋 *Tasks*
• 3 tasks due today, 1 overdue
• Highest priority: _Fix auth redirect bug_

📧 *Email*
• 12 new emails, 3 need replies
• Important: _Contract review from Sarah_

📅 *Calendar*
• 2 meetings today
• 10:00 AM — Sprint Planning (30 min)
• 2:00 PM — Client demo (1 hr)

💬 *Slack*
• 8 unread DMs
• 3 mentions in #engineering

Reply with any number for details, or ask me anything!
```

### Opt-out Handling

- Default: `whatsappDigestEnabled = true` when phone is linked
- User says "stop daily standups" / "opt out" / equivalent in any language → AYA sets `whatsappDigestEnabled = false`
- User says "turn on daily standup" / "resume" → AYA sets `whatsappDigestEnabled = true`
- Classified as SIMPLE (no tools needed, just DB update)
- AYA confirms conversationally: "Got it, daily standups paused. You can turn them back on anytime!"

---

## Error Handling & Edge Cases

### Webhook Resilience

- **Duplicate messages:** Deduplicate via `wahaMessageId` unique index. If exists, skip.
- **WAHA API down:** Log error. Inngest messages auto-retry (3x with backoff). Simple messages fail silently.
- **AI timeout:** 30-second timeout on `generateText`. On timeout: "Sorry, that took too long. Try again?"
- **Rate limiting:** Max 30 messages/user/minute. Exceeded: "Slow down! Still processing your previous messages."

### Edge Cases

| Scenario | Handling |
|----------|----------|
| User sends image/document | Store in metadata. Future: multimodal Claude processing. For now: "I can see you sent an image. I can't process images on WhatsApp yet." |
| User sends voice note | Transcribe via existing Whisper endpoint (`/api/ai/transcribe`), process transcribed text |
| Group chat message | Ignore. Only respond to direct/private messages. |
| Concurrent messages from same user | Queue via Inngest, process sequentially per user (concurrency key: userId) |
| WAHA session disconnects | Health check cron (every 5 min), auto-reconnect, admin notification after 3 failures |
| User sends "stop"/"unsubscribe" | Only affects digest. Chat stays active. AYA confirms clearly. |
| Multiple rapid messages | Batch within 2-second window, concatenate, process as one |

### WAHA Session Health Monitor

Inngest cron every 5 minutes:
1. `GET /api/sessions/default` on WAHA
2. If status !== `WORKING` → attempt `POST /api/sessions/default/restart`
3. If 3 consecutive failures → create admin Notification in database

---

## Security & Configuration

### WAHA Authentication

All WAHA API requests include: `X-Api-Key: <WAHA_API_KEY>`

### Webhook Verification

WAHA HMAC signing configured on session creation. Webhook handler validates HMAC signature on every incoming request.

### Environment Variables (new)

```env
# WAHA
WAHA_API_URL=https://allys-ai-waha-gsvqb.ondigitalocean.app
WAHA_API_KEY=<waha-api-key>
WAHA_SESSION_NAME=default
WAHA_WEBHOOK_SECRET=<random-hmac-secret>

# WhatsApp
WHATSAPP_AYA_PHONE=<aya-whatsapp-number>

# OpenAI TTS (OPENAI_API_KEY already exists)
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=nova
```

### WAHA Session Setup (one-time)

```json
POST /api/sessions
{
  "name": "default",
  "config": {
    "webhooks": [{
      "url": "https://<app-url>/api/webhooks/waha",
      "events": ["message", "session.status"],
      "hmac": { "key": "<WAHA_WEBHOOK_SECRET>" }
    }]
  }
}
```

Subscribe only to `message` and `session.status`. NOT `message.any` (would include outbound, causing loops).

### Data Privacy

- WhatsApp messages follow same retention as AIChatMessage
- No message content logged in production (metadata only)
- Phone numbers stored without `+` prefix (WAHA format)
- Voice notes generated on-the-fly, not stored permanently
