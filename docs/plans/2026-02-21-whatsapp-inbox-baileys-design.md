# WhatsApp Unified Inbox Integration via Baileys

**Date:** 2026-02-21
**Status:** Approved

## Overview

Add WhatsApp DM integration to the unified inbox, allowing users to connect up to 3 WhatsApp numbers, view incoming DMs, and reply with text, audio, and file attachments. Uses the Baileys library (WebSocket-based, no browser/Puppeteer) running as a separate Express microservice.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| WhatsApp client library | Baileys (@whiskeysockets/baileys) | Pure WebSocket, no Puppeteer overhead. Free, unlimited sessions. Supports all media types. |
| Runtime architecture | Separate Express microservice | Baileys needs persistent WebSocket connections; Next.js API routes are stateless. |
| Real-time communication | Express + WebSocket + Redis Pub/Sub | Bidirectional real-time for QR codes and status. Redis scales to 300+ sessions (100 users × 3). |
| Database approach | Shared PostgreSQL via Prisma | Single source of truth for user-session mappings. No data duplication. |
| Message storage | Live-fetch from Baileys on demand | Like Slack/Teams pattern. No WhatsApp messages persisted in DB. |
| QR authentication | Both QR code scan and pairing code | Maximum flexibility for users. |
| AYA bot coexistence | Keep WAHA for AYA, Baileys for inbox | Don't touch working AYA agent. Two separate systems. |
| Prisma migrations | Schema file update only | User handles generation and migration manually. |

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                     │
│                                                          │
│  Settings/Integrations    Messages/Inbox    Onboarding   │
│  ┌─────────────────┐   ┌──────────────┐  ┌───────────┐  │
│  │ WhatsApp Connect │   │ WhatsApp DMs │  │ Phone #   │  │
│  │ (QR/Pairing)     │   │ (Live-fetch) │  │ Collector │  │
│  └────────┬────────┘   └──────┬───────┘  └───────────┘  │
│           │ WebSocket          │ REST                     │
└───────────┼────────────────────┼─────────────────────────┘
            │                    │
┌───────────┼────────────────────┼─────────────────────────┐
│           ▼                    ▼                          │
│       NEXT.JS API ROUTES (Proxy Layer)                    │
│  /api/integrations/whatsapp-inbox/*                       │
│  - /sessions         → CRUD WhatsApp sessions             │
│  - /sessions/:id/*   → chats, messages, send              │
│  - /ws               → WebSocket proxy for QR/status      │
└───────────┬────────────────────┬─────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────────────────────────┐    ┌──────────────┐
│     BAILEYS MICROSERVICE            │    │    REDIS      │
│     (Express + WS + Baileys)        │◄──►│   Pub/Sub    │
│                                     │    │              │
│  SessionManager                     │    │  Channels:   │
│  ├─ createSession(sessionId, slot)  │    │  wa:qr:{id}  │
│  ├─ destroySession(sessionId)       │    │  wa:status   │
│  ├─ getChats(sessionId)             │    │  wa:msg:{id} │
│  ├─ getMessages(sessionId, chatId)  │    └──────────────┘
│  ├─ sendText(sessionId, to, text)   │           ▲
│  ├─ sendMedia(sessionId, to, file)  │           │
│  ├─ sendAudio(sessionId, to, audio) │           │
│  └─ getStatus(sessionId)            │    ┌──────┴───────┐
│                                     │    │  POSTGRESQL   │
│  Auth Store: PostgreSQL             │    │  (Shared DB)  │
│  Session creds persisted per user   │    │              │
└─────────────────────────────────────┘    │  Integration  │
                                           │  User         │
        (WAHA stays separate for AYA bot)  │  Contact      │
                                           └──────────────┘
```

## Database Schema Changes

### New model: WhatsAppSession

```prisma
model WhatsAppSession {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  slot          Int      // 1, 2, or 3
  phone         String?  // populated after successful connection
  displayName   String?  // WhatsApp profile name
  profilePicUrl String?
  status        String   @default("disconnected") // disconnected | connecting | qr_ready | connected
  lastSeen      DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([userId, slot])
  @@unique([phone])
  @@index([userId])
}
```

### New model: WhatsAppAuth (Baileys credentials)

```prisma
model WhatsAppAuth {
  id        String   @id  // matches WhatsAppSession.id
  creds     Json         // Baileys auth credentials blob
  keys      Json         // Baileys signal keys blob
  updatedAt DateTime @updatedAt
}
```

### User model update

```prisma
// Add relation
whatsappSessions  WhatsAppSession[]
```

No changes to existing Message/Contact tables (live-fetch, not persisted).

## Baileys Microservice

### Directory structure

```
services/whatsapp-bridge/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts              # Express + WS server entry
│   ├── config.ts             # env vars, constants
│   ├── session-manager.ts    # Core: create/destroy/manage Baileys sessions
│   ├── auth-store.ts         # PostgreSQL-backed Baileys auth persistence
│   ├── redis.ts              # Redis client + pub/sub helpers
│   ├── routes/
│   │   ├── sessions.ts       # CRUD: create, delete, list, status
│   │   ├── messages.ts       # GET chats, GET messages, POST send
│   │   └── health.ts         # Health check
│   ├── middleware/
│   │   └── auth.ts           # API key validation (shared secret with Next.js)
│   └── types.ts              # Shared types
```

### REST API (internal, API-key protected)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/sessions` | Create new session, start QR flow |
| DELETE | `/sessions/:id` | Disconnect + delete session |
| GET | `/sessions/:id/status` | Get connection status |
| GET | `/sessions/:id/chats` | List all chats |
| GET | `/sessions/:id/chats/:chatId/messages` | Get messages for a chat |
| POST | `/sessions/:id/send/text` | Send text message |
| POST | `/sessions/:id/send/media` | Send image/doc/video |
| POST | `/sessions/:id/send/audio` | Send voice note (OGG Opus) |
| GET | `/health` | Service health + active session count |

### Redis Pub/Sub channels

| Channel | Payload | Consumer |
|---------|---------|----------|
| `wa:qr:{sessionId}` | `{qr: string}` | Frontend via Next.js WS proxy |
| `wa:status:{sessionId}` | `{status, phone, displayName}` | Frontend + Next.js |
| `wa:msg:{sessionId}` | `{from, message, timestamp}` | Next.js for notifications |

### Session lifecycle

1. `createSession(sessionId)` → initialize Baileys socket with PostgreSQL auth store
2. Emit QR via Redis `wa:qr:{sessionId}` (refreshes every ~20s)
3. On auth success → update `WhatsAppSession.status = "connected"`, save phone/displayName
4. Register message listener → publish incoming to `wa:msg:{sessionId}`
5. On service restart → reload all "connected" sessions from DB, re-initialize with persisted auth

### Service-to-service auth

Shared `WHATSAPP_BRIDGE_API_KEY` env var validated via Express middleware on every request.

## Next.js API Routes (Proxy Layer)

```
app/api/integrations/whatsapp-inbox/
├── sessions/
│   ├── route.ts              # GET (list), POST (create)
│   └── [sessionId]/
│       ├── route.ts          # DELETE (disconnect), GET (status)
│       ├── chats/
│       │   └── route.ts      # GET (list chats)
│       ├── messages/
│       │   └── route.ts      # GET (messages), POST (send text)
│       ├── send-media/
│       │   └── route.ts      # POST (send file/image)
│       └── send-audio/
│           └── route.ts      # POST (send voice note)
└── ws/
    └── route.ts              # WebSocket → subscribe Redis for QR/status
```

Each route: validates Better Auth session → verifies user owns the WhatsApp session → proxies to Baileys service with API key → returns response.

## Frontend Changes

### Integrations Settings Page

- WhatsApp Inbox section with 3 slot cards
- Each slot: Connected (phone, pic, name, disconnect) | Disconnected (connect button) | Connecting (QR modal)
- `WhatsAppConnectModal`: Tab 1 = live QR code via WebSocket, Tab 2 = pairing code input

### Messages Page

- Add "WhatsApp" to channel filter dropdown
- When active: fetch chats from all connected sessions, merge by recency
- Chat detail: message history (text + media), reply composer
- Reply composer: text input, file attachment, voice recorder, session selector (which number to reply from)

### Onboarding Flow

- New step after use-case: "What's your WhatsApp number?"
- Phone input with country code picker + "Skip for now"
- Saves to `User.whatsappPhone` for AYA agent linking
- Does NOT connect to inbox (that's in Settings)

## Error Handling

| Scenario | Handling |
|----------|----------|
| Phone offline >14 days | Baileys detects disconnect, updates status, Redis event, UI shows reconnect |
| 4th number attempt | Frontend blocks, API returns 400 |
| Duplicate phone | DB unique constraint, API returns conflict |
| Service restart | Reload connected sessions from DB, re-init Baileys with persisted auth |
| QR expiry | Baileys auto-generates new QR, pushed via Redis |
| Redis down | Fallback to HTTP polling for status |
| Large media | 16MB WhatsApp limit enforced on upload |
| Audio format | Convert to OGG Opus (ffmpeg or browser MediaRecorder) |

## Environment Variables

### Baileys microservice
```
DATABASE_URL=postgresql://...         # Same DB as Next.js
REDIS_URL=redis://localhost:6379
WHATSAPP_BRIDGE_API_KEY=<shared-secret>
WHATSAPP_BRIDGE_PORT=3001
MAX_SESSIONS_PER_USER=3
```

### Next.js (additions)
```
WHATSAPP_BRIDGE_URL=http://localhost:3001
WHATSAPP_BRIDGE_API_KEY=<same-shared-secret>
REDIS_URL=redis://localhost:6379
```
