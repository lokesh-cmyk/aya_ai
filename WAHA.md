# WAHA WhatsApp Integration — Reference Guide

## Webhook URL

```
https://<YOUR_DEPLOYED_APP_URL>/api/webhooks/waha
```

Replace `<YOUR_DEPLOYED_APP_URL>` with your actual deployed domain (e.g. `https://unified-box.vercel.app`).

For local development with a tunnel (e.g. ngrok):

```
https://<ngrok-subdomain>.ngrok-free.app/api/webhooks/waha
```

---

## WAHA Dashboard Configuration

1. Open your WAHA instance dashboard: `https://allys-ai-waha-gsvqb.ondigitalocean.app/`
2. Go to **Sessions** and select your session (default: `default`)
3. Under **Webhooks**, set:
   - **URL**: `https://<YOUR_DEPLOYED_APP_URL>/api/webhooks/waha`
   - **Events**: `message`, `session.status`
   - **HMAC Secret**: Set the same value as your `WAHA_WEBHOOK_SECRET` env var
4. Save the webhook configuration

Alternatively, run the setup script (see below).

---

## Environment Variables

Add these to your `.env` file:

| Variable | Description | Example |
|---|---|---|
| `WAHA_API_URL` | WAHA instance base URL | `https://allys-ai-waha-gsvqb.ondigitalocean.app` |
| `WAHA_API_KEY` | WAHA API key (from dashboard) | `your-api-key` |
| `WAHA_SESSION_NAME` | WAHA session name | `default` |
| `WAHA_WEBHOOK_SECRET` | HMAC secret for webhook verification | `a-random-secret-string` |
| `WHATSAPP_AYA_PHONE` | AYA's WhatsApp phone number (with country code) | `+1234567890` |
| `OPENAI_TTS_MODEL` | OpenAI TTS model for voice notes | `tts-1` |
| `OPENAI_TTS_VOICE` | OpenAI TTS voice for voice notes | `nova` |

---

## Setup Steps

### 1. Run Prisma Migration

```bash
npx prisma migrate dev --name add-whatsapp-integration
```

This adds:
- `whatsappPhone`, `whatsappLinkedAt`, `whatsappDigestEnabled` fields to the `User` model
- `WhatsAppConversation` model (conversation sessions with 24hr auto-reset)
- `WhatsAppMessage` model (message history per conversation)

### 2. Set Environment Variables

Copy the WAHA variables from `.env.example` into your `.env` and fill in actual values.

### 3. Run WAHA Setup Script

```bash
npx tsx scripts/setup-waha.ts
```

This script will:
- Create or verify the WAHA session
- Configure the webhook URL and HMAC secret
- Subscribe to `message` and `session.status` events

### 4. Pair WhatsApp Number

- Open the WAHA dashboard
- Navigate to **Sessions** → your session
- Scan the QR code with the AYA WhatsApp number's phone
- Wait for the session status to show `WORKING`

### 5. Deploy and Test

- Deploy your app (Vercel, etc.)
- Update the webhook URL in WAHA to use your production domain
- Send a test message to AYA's WhatsApp number from a phone linked to a Unified Box account

---

## Architecture Overview

```
User's WhatsApp
      │
      ▼
WAHA Instance (DigitalOcean)
      │ POST /api/webhooks/waha
      ▼
┌─────────────────────────────┐
│  Webhook Handler (route.ts) │
│  - HMAC verification        │
│  - User identification      │
│  - Intent classification    │
└─────┬──────────┬────────────┘
      │          │
  Simple      Complex
      │          │
      ▼          ▼
  Direct     Inngest Queue
  Process    (whatsapp/process-complex-message)
      │          │
      ▼          ▼
┌─────────────────────────────┐
│  Processor (processor.ts)   │
│  - Load conversation history│
│  - Load user context        │
│  - Load Mem0 memories       │
│  - Claude AI (generateText) │
│  - Composio tools (complex) │
│  - Format for WhatsApp      │
└─────────────────────────────┘
      │
      ▼
WAHA sendText → User's WhatsApp
```

### Message Flow

1. **User sends WhatsApp message** → WAHA receives it
2. **WAHA forwards to webhook** → `POST /api/webhooks/waha` with HMAC signature
3. **Webhook handler**:
   - Verifies HMAC signature (SHA-512, timing-safe)
   - Extracts phone number, message text
   - Looks up user by phone number
   - If unknown user → email-based linking flow
   - If known user → classifies intent (simple vs complex)
4. **Simple path** → processes directly in webhook handler
5. **Complex path** → queues via Inngest, sends "Let me look that up..." placeholder
6. **Processor** generates AI response using Claude + full user context + Composio tools
7. **Response** formatted for WhatsApp (bold, lists, emojis) and sent back via WAHA

### Daily Digest Flow

- **Cron**: Inngest function runs daily at scheduled time (per user timezone, 8 AM default)
- **Content**: Team standup digest (tasks, meetings, emails summary)
- **Delivery**: Text message + voice note (OpenAI TTS → OGG/Opus via WAHA converter)
- **Opt-out**: User sends "stop daily standups" or similar via WhatsApp chat

---

## File Reference

| File | Purpose |
|---|---|
| `app/api/webhooks/waha/route.ts` | Webhook endpoint — HMAC verification, user ID, intent routing |
| `lib/integrations/waha.ts` | WAHA REST API client — sendText, sendVoice, typing indicators, etc. |
| `lib/whatsapp/processor.ts` | Core AI processor — conversation management, Claude invocation |
| `lib/whatsapp/formatter.ts` | Markdown → WhatsApp formatting, message splitting (4000 char limit) |
| `lib/whatsapp/classifier.ts` | Intent classification — simple vs complex routing |
| `lib/whatsapp/user-linker.ts` | Phone-to-account linking — lookup + email-based onboarding |
| `lib/whatsapp/voice.ts` | Voice note generation — OpenAI TTS + WAHA media converter |
| `lib/inngest/functions/whatsapp-message.ts` | Inngest function for complex message processing |
| `lib/inngest/functions/whatsapp-session-health.ts` | WAHA session health monitor (every 5 min) |
| `lib/inngest/functions/daily-digest.ts` | Extended to send WhatsApp text + voice digest |
| `scripts/setup-waha.ts` | One-time WAHA session + webhook setup script |
| `prisma/schema.prisma` | Database schema — WhatsAppConversation + WhatsAppMessage models |

---

## User Onboarding Flow

1. **New user messages AYA on WhatsApp** (phone not linked to any account)
2. **AYA asks for their email**: "I don't recognize this number yet. Could you share the email address you used to sign up on AYA?"
3. **User sends their email**
4. **System looks up email** in the User table:
   - Found → links phone number to account, sends welcome message
   - Not found → tells user no account exists with that email
5. **User is now linked** — all future messages are processed with their full account context
6. **Daily digest auto-enabled** — `whatsappDigestEnabled` defaults to `true`

---

## Intent Classification

| Category | Examples | Processing |
|---|---|---|
| **Simple** | "hi", "thanks", "how are you", "what's the weather", digest toggle phrases | Direct (in webhook) |
| **Complex** | "check my slack", "email summary", "create a task", "what's on my calendar" | Queued (Inngest) |
| **Digest Toggle** | "stop daily standups", "pause digest", "enable daily standup" | Direct toggle handler |

---

## Health Monitoring

- **Cron job** runs every 5 minutes via Inngest (`waha-session-health-check`)
- Calls WAHA `/api/sessions/{name}/status` endpoint
- If session is not `WORKING`:
  - Increments failure counter (persisted in DB)
  - Attempts auto-restart via WAHA API
  - After 3 consecutive failures → creates admin notification
- When session recovers → resets failure counter

---

## Troubleshooting

| Issue | Check |
|---|---|
| Webhook not receiving messages | Verify webhook URL in WAHA dashboard, check HMAC secret matches |
| "Invalid signature" 403 errors | Ensure `WAHA_WEBHOOK_SECRET` matches the secret configured in WAHA |
| User not found | User needs to send their email to link their phone number |
| No response from AYA | Check WAHA session status (should be `WORKING`), check server logs |
| Voice notes not sending | Ensure `OPENAI_API_KEY` is set, check WAHA media converter endpoint |
| Daily digest not arriving | Check `whatsappDigestEnabled` is `true` on user record, check Inngest dashboard |

---

## WAHA Instance

- **URL**: `https://allys-ai-waha-gsvqb.ondigitalocean.app/`
- **Swagger API Docs**: `https://allys-ai-waha-gsvqb.ondigitalocean.app/swagger/`
- **OpenAPI Spec**: `https://allys-ai-waha-gsvqb.ondigitalocean.app/swagger/openapi.json`

---

## Git Branch

All implementation is on branch `feat/whatsapp-aya-integration` (15 commits, 14 files changed, ~1,750 lines added).
