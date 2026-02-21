# WhatsApp Bridge Service

Standalone Express microservice that manages WhatsApp sessions via [Baileys](https://github.com/WhiskeySockets/Baileys). It handles QR code generation, pairing codes, message fetching, and sending (text, media, audio) for up to 3 WhatsApp numbers per user.

Communicates with the main Next.js app through:
- **REST API** (authenticated with a shared API key)
- **Redis Pub/Sub** (real-time events: QR codes, connection status, incoming messages)
- **WebSocket** (frontend subscribes for live QR/status updates)

## Prerequisites

- **Node.js** >= 18
- **PostgreSQL** (shared database with the main app)
- **Redis** (native Redis, not Upstash — requires true Pub/Sub support)

## Local Development Setup

### 1. Install dependencies

```bash
cd services/whatsapp-bridge
npm install
```

### 2. Generate Prisma client

```bash
npx prisma generate
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (same DB as main app) |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL for Pub/Sub |
| `WHATSAPP_BRIDGE_API_KEY` | Yes | — | Shared secret for API authentication (must match the main app's `WHATSAPP_BRIDGE_API_KEY`) |
| `WHATSAPP_BRIDGE_PORT` | No | `3001` | Port the bridge listens on |
| `MAX_SESSIONS_PER_USER` | No | `3` | Maximum WhatsApp numbers per user |

### 4. Run the database migration

The bridge shares the same database as the main Next.js app. Run migrations from the **root project**:

```bash
# From the project root (not from services/whatsapp-bridge)
npx prisma migrate dev
```

### 5. Start the service

```bash
npm run dev
```

The service starts on `http://localhost:3001` with hot-reload via `tsx watch`.

### 6. Configure the main Next.js app

Add these to the root project's `.env.local`:

```env
WHATSAPP_BRIDGE_URL=http://localhost:3001
WHATSAPP_BRIDGE_API_KEY=<same key as bridge .env>
NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL=ws://localhost:3001/ws?apiKey=<same key>
```

### 7. Verify it's running

```bash
curl http://localhost:3001/health
# {"status":"ok","activeSessions":0}
```

## API Endpoints

All endpoints except `/health` require the `x-api-key` header matching `WHATSAPP_BRIDGE_API_KEY`.

### Health
| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check (no auth) |

### Sessions
| Method | Path | Description |
|---|---|---|
| POST | `/sessions` | Create a new WhatsApp session (starts QR flow) |
| DELETE | `/sessions/:id` | Disconnect and remove a session |
| GET | `/sessions/:id/status` | Get session connection status |
| POST | `/sessions/:id/pairing-code` | Request a pairing code (body: `{ phone: "+1234567890" }`) |

### Messages
| Method | Path | Description |
|---|---|---|
| GET | `/sessions/:id/chats` | List chats for a session |
| GET | `/sessions/:id/chats/:chatId/messages` | Get messages for a chat (query: `?limit=50`) |
| POST | `/sessions/:id/send/text` | Send text message (body: `{ chatId, text }`) |
| POST | `/sessions/:id/send/media` | Send media file (multipart: `file` + `chatId` + optional `caption`) |
| POST | `/sessions/:id/send/audio` | Send voice note (multipart: `audio` + `chatId`) |

## Redis Pub/Sub Channels

The bridge publishes events to these Redis channels:

| Channel | Payload | When |
|---|---|---|
| `wa:qr:<sessionId>` | `{ sessionId, qr, qrDataUrl }` | New QR code generated for scanning |
| `wa:status:<sessionId>` | `{ sessionId, status, phone?, displayName? }` | Connection status changes |
| `wa:message:<userId>` | `{ sessionId, message }` | Incoming message received |

## Monorepo + Vercel: How It Works

The main AYA AI app (Next.js) is hosted on **Vercel**. This bridge service lives in `services/whatsapp-bridge/` inside the same repo — and that's perfectly fine.

**Vercel completely ignores the `services/` directory.** It only looks at your root `package.json`, `next.config.js`, and `app/` directory. It won't try to build, install, or run anything inside `services/`. You do not need to remove this folder.

**They are two independent services that talk over the network:**

| Service | Hosted On | Deployment |
|---|---|---|
| AYA AI (Next.js) | **Vercel** (unchanged) | Deploys as usual — zero changes needed |
| WhatsApp Bridge | **Any cloud with long-lived processes** (Railway, Render, DigitalOcean, etc.) | Deploy only the `services/whatsapp-bridge` directory |

**The only connection between them:**
1. **Shared PostgreSQL database** — both read/write the same tables
2. **REST API calls** — Next.js calls the bridge via `WHATSAPP_BRIDGE_URL`
3. **Redis Pub/Sub** — real-time events between the two
4. **WebSocket** — frontend connects directly to the bridge for live QR/status updates

**After deploying the bridge, add these 3 env vars to your Vercel project settings:**

```env
WHATSAPP_BRIDGE_URL=https://your-bridge-domain.com
WHATSAPP_BRIDGE_API_KEY=your-shared-secret
NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL=wss://your-bridge-domain.com/ws?apiKey=your-shared-secret
```

> **TL;DR:** Keep everything in one repo. Deploy Next.js on Vercel, deploy this bridge separately. They connect via env vars. No complications.

---

## Production Deployment

### Build

```bash
npm run build
```

This compiles TypeScript to `dist/`. Run with:

```bash
node dist/index.js
```

### Docker

Create a `Dockerfile` in `services/whatsapp-bridge/`:

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY dist ./dist

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/index.js"]
```

Build and run:

```bash
npm run build
docker build -t whatsapp-bridge .
docker run -d \
  --name whatsapp-bridge \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  -e WHATSAPP_BRIDGE_API_KEY="your-secret" \
  whatsapp-bridge
```

### Docker Compose (with Redis)

```yaml
version: "3.8"
services:
  whatsapp-bridge:
    build: ./services/whatsapp-bridge
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
      WHATSAPP_BRIDGE_API_KEY: ${WHATSAPP_BRIDGE_API_KEY}
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
```

### Cloud Deployment Notes

**DigitalOcean App Platform / Railway / Render:**
- Deploy as a standalone service pointing to the `services/whatsapp-bridge` directory
- Set build command: `npm install && npx prisma generate && npm run build`
- Set run command: `node dist/index.js`
- Ensure Redis add-on supports native connections (not HTTP-only like Upstash)
- The WebSocket endpoint (`/ws`) requires the platform to support WebSocket upgrades

**Important considerations:**
- This service maintains **persistent WebSocket connections** to WhatsApp servers, so it must run on infrastructure that supports long-lived processes (not serverless/Lambda)
- Sessions are restored automatically on service restart from the database
- A single instance can handle ~300 concurrent sessions comfortably
- For horizontal scaling, use sticky sessions — each WhatsApp connection must stay on the same instance

### Reverse Proxy (Nginx)

If running behind Nginx, ensure WebSocket upgrade is configured:

```nginx
location /ws {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}

location / {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## Troubleshooting

| Issue | Solution |
|---|---|
| `Missing required env var: DATABASE_URL` | Set `DATABASE_URL` in `.env` |
| `Missing required env var: WHATSAPP_BRIDGE_API_KEY` | Set `WHATSAPP_BRIDGE_API_KEY` in `.env` |
| Prisma generate fails with datasource error | Ensure `prisma.config.ts` exists (Prisma v7 requirement) |
| QR code not appearing in frontend | Check `NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL` is correct and WebSocket connections aren't blocked |
| Redis connection refused | Ensure Redis is running and `REDIS_URL` is correct; Upstash HTTP Redis won't work — need native Redis |
| Session not restoring after restart | Check that auth credentials are saved in `WhatsAppAuth` table |
| 401 from bridge API | Ensure `WHATSAPP_BRIDGE_API_KEY` matches between bridge `.env` and main app `.env.local` |

## Architecture

```
Next.js App                          WhatsApp Bridge
┌─────────────────┐                  ┌──────────────────────┐
│  Settings UI    │──── REST API ───>│  Express Server      │
│  Messages Page  │<── WebSocket ────│  WebSocket Server    │
│  API Routes     │──── REST API ───>│  Session Manager     │
└────────┬────────┘                  │    ├── Baileys (x3)  │
         │                           │    ├── Auth Store     │
         │                           │    └── Redis Pub/Sub  │
         │                           └──────────┬───────────┘
         │                                      │
         └──────── PostgreSQL (shared) ─────────┘
                   Redis (Pub/Sub)
```
