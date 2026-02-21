# WhatsApp Unified Inbox (Baileys) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to connect up to 3 WhatsApp numbers via Baileys and view/reply to DMs in the unified inbox with text, audio, and file support.

**Architecture:** Separate Express microservice (`services/whatsapp-bridge/`) manages Baileys sessions and communicates with the Next.js app via REST API + Redis Pub/Sub for real-time events (QR codes, connection status). Messages are live-fetched from Baileys on demand.

**Tech Stack:** Baileys (`@whiskeysockets/baileys`), Express, `ws` (WebSocket), `ioredis` (Pub/Sub), PostgreSQL (shared via Prisma), Upstash Redis (Next.js caching)

**Design Doc:** `docs/plans/2026-02-21-whatsapp-inbox-baileys-design.md`

---

## Phase 1: Database Schema + Prisma

### Task 1: Add WhatsAppSession and WhatsAppAuth models to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma` (User model at lines 43-100, add new models after line 830)

**Step 1: Add WhatsAppSession model**

Add after the Reminder model (line ~830) in `prisma/schema.prisma`:

```prisma
model WhatsAppSession {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation("UserWhatsAppSessions", fields: [userId], references: [id], onDelete: Cascade)
  slot          Int       // 1, 2, or 3
  phone         String?   // populated after successful connection
  displayName   String?   // WhatsApp profile name
  profilePicUrl String?
  status        String    @default("disconnected") // disconnected | connecting | qr_ready | connected
  lastSeen      DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([userId, slot])
  @@unique([phone])
  @@index([userId])
  @@index([status])
}

model WhatsAppAuth {
  id        String   @id // matches WhatsAppSession.id
  creds     Json     // Baileys auth credentials blob
  keys      Json     // Baileys signal keys blob
  updatedAt DateTime @updatedAt
}
```

**Step 2: Add relation to User model**

In the User model (around line 94, near existing `whatsappConversations` relation), add:

```prisma
whatsappSessions      WhatsAppSession[] @relation("UserWhatsAppSessions")
```

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add WhatsAppSession and WhatsAppAuth models"
```

**Note:** User will run `npx prisma generate` and `npx prisma migrate` manually.

---

## Phase 2: Baileys Microservice

### Task 2: Scaffold the whatsapp-bridge service

**Files:**
- Create: `services/whatsapp-bridge/package.json`
- Create: `services/whatsapp-bridge/tsconfig.json`
- Create: `services/whatsapp-bridge/.env.example`
- Create: `services/whatsapp-bridge/src/config.ts`
- Create: `services/whatsapp-bridge/src/types.ts`

**Step 1: Create package.json**

```json
{
  "name": "whatsapp-bridge",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.16",
    "@prisma/client": "^7.2.0",
    "express": "^4.21.0",
    "ws": "^8.18.0",
    "ioredis": "^5.4.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "pino": "^9.5.0",
    "multer": "^1.4.5-lts.1",
    "qrcode": "^1.5.4"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/ws": "^8.5.13",
    "@types/cors": "^2.8.17",
    "@types/multer": "^1.4.12",
    "@types/qrcode": "^1.5.5",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "prisma": "^7.2.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create .env.example**

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/unified_box
REDIS_URL=redis://localhost:6379
WHATSAPP_BRIDGE_API_KEY=your-shared-secret-here
WHATSAPP_BRIDGE_PORT=3001
MAX_SESSIONS_PER_USER=3
```

**Step 4: Create src/config.ts**

```typescript
import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.WHATSAPP_BRIDGE_PORT || "3001", 10),
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  apiKey: process.env.WHATSAPP_BRIDGE_API_KEY!,
  maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER || "3", 10),
};

// Validate required env vars at startup
const required = ["DATABASE_URL", "WHATSAPP_BRIDGE_API_KEY"] as const;
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}
```

**Step 5: Create src/types.ts**

```typescript
export interface SessionInfo {
  id: string;
  userId: string;
  slot: number;
  phone: string | null;
  displayName: string | null;
  profilePicUrl: string | null;
  status: "disconnected" | "connecting" | "qr_ready" | "connected";
  lastSeen: Date | null;
}

export interface ChatInfo {
  id: string; // WhatsApp JID (e.g., 919876543210@s.whatsapp.net)
  name: string;
  phone: string;
  profilePicUrl?: string;
  lastMessage?: {
    content: string;
    timestamp: number;
    fromMe: boolean;
  };
  unreadCount: number;
  isGroup: boolean;
}

export interface MessageInfo {
  id: string;
  chatId: string;
  content: string;
  timestamp: number;
  fromMe: boolean;
  senderName?: string;
  type: "text" | "image" | "video" | "audio" | "document" | "sticker" | "other";
  mediaUrl?: string;
  mimetype?: string;
  filename?: string;
  caption?: string;
  quotedMessage?: {
    id: string;
    content: string;
  };
}

export interface QREvent {
  sessionId: string;
  qr: string; // base64 encoded QR image
}

export interface StatusEvent {
  sessionId: string;
  status: SessionInfo["status"];
  phone?: string;
  displayName?: string;
}

export interface IncomingMessageEvent {
  sessionId: string;
  chatId: string;
  message: MessageInfo;
}

// Redis channel helpers
export const redisChannels = {
  qr: (sessionId: string) => `wa:qr:${sessionId}`,
  status: (sessionId: string) => `wa:status:${sessionId}`,
  message: (sessionId: string) => `wa:msg:${sessionId}`,
};
```

**Step 6: Commit**

```bash
git add services/whatsapp-bridge/
git commit -m "feat(wa-bridge): scaffold whatsapp-bridge microservice"
```

---

### Task 3: Implement Prisma client and Redis for the bridge service

**Files:**
- Create: `services/whatsapp-bridge/prisma/schema.prisma` (symlink or copy — see note)
- Create: `services/whatsapp-bridge/src/prisma.ts`
- Create: `services/whatsapp-bridge/src/redis.ts`

**Note on Prisma:** The bridge service shares the same PostgreSQL database. The simplest approach is to add a `prisma/schema.prisma` to the bridge service that contains ONLY the models it needs (WhatsAppSession, WhatsAppAuth, User id+phone fields). Alternatively, configure the bridge's package.json to point Prisma at the root schema. For simplicity, we'll generate a dedicated Prisma client in the bridge service that reads from the same DB.

**Step 1: Create minimal Prisma schema for bridge**

Create `services/whatsapp-bridge/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id               String             @id
  email            String             @unique
  name             String
  whatsappPhone    String?            @unique
  whatsappSessions WhatsAppSession[]  @relation("UserWhatsAppSessions")
}

model WhatsAppSession {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation("UserWhatsAppSessions", fields: [userId], references: [id], onDelete: Cascade)
  slot          Int
  phone         String?
  displayName   String?
  profilePicUrl String?
  status        String    @default("disconnected")
  lastSeen      DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([userId, slot])
  @@unique([phone])
  @@index([userId])
  @@index([status])
}

model WhatsAppAuth {
  id        String   @id
  creds     Json
  keys      Json
  updatedAt DateTime @updatedAt
}
```

**Step 2: Create src/prisma.ts**

```typescript
import { PrismaClient } from "./generated/prisma";

export const prisma = new PrismaClient();
```

**Step 3: Create src/redis.ts**

```typescript
import Redis from "ioredis";
import { config } from "./config";

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

export function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(config.redisUrl);
    publisher.on("error", (err) => console.error("Redis publisher error:", err));
  }
  return publisher;
}

export function getSubscriber(): Redis {
  if (!subscriber) {
    subscriber = new Redis(config.redisUrl);
    subscriber.on("error", (err) => console.error("Redis subscriber error:", err));
  }
  return subscriber;
}

export async function publish(channel: string, data: unknown): Promise<void> {
  await getPublisher().publish(channel, JSON.stringify(data));
}

export async function cleanup(): Promise<void> {
  if (publisher) await publisher.quit();
  if (subscriber) await subscriber.quit();
}
```

**Step 4: Add prisma generate script to bridge package.json**

Add to `services/whatsapp-bridge/package.json` scripts:

```json
"prisma:generate": "prisma generate --schema=prisma/schema.prisma"
```

**Step 5: Commit**

```bash
git add services/whatsapp-bridge/prisma/ services/whatsapp-bridge/src/prisma.ts services/whatsapp-bridge/src/redis.ts services/whatsapp-bridge/package.json
git commit -m "feat(wa-bridge): add Prisma client and Redis pub/sub"
```

---

### Task 4: Implement the Baileys auth store (PostgreSQL-backed)

**Files:**
- Create: `services/whatsapp-bridge/src/auth-store.ts`

**Step 1: Implement PostgreSQL auth state for Baileys**

Baileys requires an auth state object with `creds` and `keys` (signal protocol). We store these in the `WhatsAppAuth` table.

```typescript
import {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
  initAuthCreds,
  proto,
  BufferJSON,
} from "@whiskeysockets/baileys";
import { prisma } from "./prisma";

export async function usePostgresAuthState(
  sessionId: string
): Promise<{ state: AuthenticationState; saveState: () => Promise<void> }> {
  // Load or create credentials
  const existing = await prisma.whatsAppAuth.findUnique({
    where: { id: sessionId },
  });

  let creds: AuthenticationCreds;
  let keys: Record<string, Record<string, unknown>> = {};

  if (existing) {
    creds = JSON.parse(JSON.stringify(existing.creds), BufferJSON.reviver);
    keys = JSON.parse(JSON.stringify(existing.keys), BufferJSON.reviver);
  } else {
    creds = initAuthCreds();
  }

  const saveState = async () => {
    const credsJson = JSON.parse(JSON.stringify(creds, BufferJSON.replacer));
    const keysJson = JSON.parse(JSON.stringify(keys, BufferJSON.replacer));

    await prisma.whatsAppAuth.upsert({
      where: { id: sessionId },
      update: { creds: credsJson, keys: keysJson },
      create: { id: sessionId, creds: credsJson, keys: keysJson },
    });
  };

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async <T extends keyof SignalDataTypeMap>(
        type: T,
        ids: string[]
      ): Promise<Record<string, SignalDataTypeMap[T]>> => {
        const data: Record<string, SignalDataTypeMap[T]> = {};
        const typeKeys = keys[type] || {};
        for (const id of ids) {
          if (typeKeys[id]) {
            data[id] = typeKeys[id] as SignalDataTypeMap[T];
          }
        }
        return data;
      },
      set: async (data: Record<string, Record<string, unknown>>) => {
        for (const category in data) {
          if (!keys[category]) keys[category] = {};
          for (const id in data[category]) {
            const value = data[category][id];
            if (value) {
              keys[category][id] = value;
            } else {
              delete keys[category][id];
            }
          }
        }
        await saveState();
      },
    },
  };

  return { state, saveState };
}

export async function deleteAuthState(sessionId: string): Promise<void> {
  await prisma.whatsAppAuth.delete({ where: { id: sessionId } }).catch(() => {});
}
```

**Step 2: Commit**

```bash
git add services/whatsapp-bridge/src/auth-store.ts
git commit -m "feat(wa-bridge): implement PostgreSQL-backed Baileys auth store"
```

---

### Task 5: Implement the Session Manager (core Baileys logic)

**Files:**
- Create: `services/whatsapp-bridge/src/session-manager.ts`

**Step 1: Implement SessionManager class**

This is the core of the service — manages Baileys socket instances, handles QR codes, connection events, and incoming messages.

```typescript
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
  BaileysEventMap,
  ConnectionState,
  WAMessage,
  jidNormalizedUser,
  isJidGroup,
  downloadMediaMessage,
  getContentType,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as QRCode from "qrcode";
import pino from "pino";

import { prisma } from "./prisma";
import { usePostgresAuthState, deleteAuthState } from "./auth-store";
import { publish } from "./redis";
import { config } from "./config";
import {
  SessionInfo,
  ChatInfo,
  MessageInfo,
  redisChannels,
} from "./types";

const logger = pino({ level: "warn" });

class SessionManager {
  private sockets: Map<string, WASocket> = new Map();

  async createSession(sessionId: string): Promise<void> {
    if (this.sockets.has(sessionId)) {
      throw new Error(`Session ${sessionId} already active`);
    }

    // Update status to connecting
    await prisma.whatsAppSession.update({
      where: { id: sessionId },
      data: { status: "connecting" },
    });

    const { state, saveState } = await usePostgresAuthState(sessionId);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: false,
      logger,
      generateHighQualityLinkPreview: true,
      getMessage: async (key) => {
        return { conversation: "" };
      },
    });

    this.sockets.set(sessionId, sock);

    // Handle connection updates
    sock.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Generate QR as base64 image
        const qrImage = await QRCode.toDataURL(qr);
        await prisma.whatsAppSession.update({
          where: { id: sessionId },
          data: { status: "qr_ready" },
        });
        await publish(redisChannels.qr(sessionId), {
          sessionId,
          qr: qrImage,
        });
      }

      if (connection === "open") {
        // Successfully connected
        const phone = sock.user?.id
          ? jidNormalizedUser(sock.user.id).split("@")[0]
          : null;
        const displayName = sock.user?.name || null;

        await prisma.whatsAppSession.update({
          where: { id: sessionId },
          data: {
            status: "connected",
            phone: phone ? `+${phone}` : null,
            displayName,
            lastSeen: new Date(),
          },
        });

        await publish(redisChannels.status(sessionId), {
          sessionId,
          status: "connected",
          phone: phone ? `+${phone}` : null,
          displayName,
        });

        await saveState();
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        this.sockets.delete(sessionId);

        if (shouldReconnect) {
          // Reconnect after brief delay
          setTimeout(() => this.createSession(sessionId), 3000);
        } else {
          // Logged out — clean up
          await deleteAuthState(sessionId);
          await prisma.whatsAppSession.update({
            where: { id: sessionId },
            data: { status: "disconnected", phone: null, displayName: null },
          });
          await publish(redisChannels.status(sessionId), {
            sessionId,
            status: "disconnected",
          });
        }
      }
    });

    // Save creds on update
    sock.ev.on("creds.update", saveState);

    // Handle incoming messages
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        if (isJidGroup(msg.key.remoteJid || "")) continue; // skip groups for now

        const parsed = this.parseMessage(msg);
        if (parsed) {
          await publish(redisChannels.message(sessionId), {
            sessionId,
            chatId: msg.key.remoteJid,
            message: parsed,
          });
        }
      }

      // Update lastSeen
      await prisma.whatsAppSession.update({
        where: { id: sessionId },
        data: { lastSeen: new Date() },
      }).catch(() => {});
    });
  }

  async destroySession(sessionId: string): Promise<void> {
    const sock = this.sockets.get(sessionId);
    if (sock) {
      await sock.logout().catch(() => {});
      this.sockets.delete(sessionId);
    }
    await deleteAuthState(sessionId);
    await prisma.whatsAppSession.update({
      where: { id: sessionId },
      data: { status: "disconnected", phone: null, displayName: null, profilePicUrl: null },
    });
    await publish(redisChannels.status(sessionId), {
      sessionId,
      status: "disconnected",
    });
  }

  async getChats(sessionId: string): Promise<ChatInfo[]> {
    const sock = this.getSocket(sessionId);
    const chats = await sock.groupFetchAllParticipating(); // groups
    const store = sock; // Baileys doesn't persist chats natively

    // Fetch from WhatsApp's chat list
    // Note: Baileys doesn't have a direct getChats() — we rely on the
    // cached state from messages.upsert and chats.upsert events.
    // For MVP, we'll return contacts that have messaged us.
    // A production solution would maintain a local chat cache.

    // For now, return empty — chats are populated as messages arrive
    // The frontend will show chats based on incoming message events
    return [];
  }

  async getMessages(
    sessionId: string,
    chatId: string,
    limit: number = 50
  ): Promise<MessageInfo[]> {
    const sock = this.getSocket(sessionId);

    const messages = await sock.fetchMessageHistory(limit, {
      remoteJid: chatId,
    }).catch(() => []);

    return (messages as WAMessage[])
      .map((msg) => this.parseMessage(msg))
      .filter((m): m is MessageInfo => m !== null)
      .reverse(); // oldest first
  }

  async sendText(
    sessionId: string,
    chatId: string,
    text: string
  ): Promise<WAMessage> {
    const sock = this.getSocket(sessionId);
    return sock.sendMessage(chatId, { text });
  }

  async sendMedia(
    sessionId: string,
    chatId: string,
    buffer: Buffer,
    mimetype: string,
    filename?: string,
    caption?: string
  ): Promise<WAMessage> {
    const sock = this.getSocket(sessionId);

    if (mimetype.startsWith("image/")) {
      return sock.sendMessage(chatId, {
        image: buffer,
        mimetype,
        caption,
      });
    } else if (mimetype.startsWith("video/")) {
      return sock.sendMessage(chatId, {
        video: buffer,
        mimetype,
        caption,
      });
    } else {
      return sock.sendMessage(chatId, {
        document: buffer,
        mimetype,
        fileName: filename || "file",
        caption,
      });
    }
  }

  async sendAudio(
    sessionId: string,
    chatId: string,
    buffer: Buffer
  ): Promise<WAMessage> {
    const sock = this.getSocket(sessionId);
    return sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: "audio/ogg; codecs=opus",
      ptt: true, // voice note
    });
  }

  async getPairingCode(sessionId: string, phone: string): Promise<string> {
    const sock = this.getSocket(sessionId);
    // Phone must be without + prefix, just digits
    const cleaned = phone.replace(/[^0-9]/g, "");
    const code = await sock.requestPairingCode(cleaned);
    return code;
  }

  getStatus(sessionId: string): string {
    return this.sockets.has(sessionId) ? "active" : "inactive";
  }

  getActiveSessionCount(): number {
    return this.sockets.size;
  }

  // Restore all "connected" sessions on service startup
  async restoreAllSessions(): Promise<void> {
    const sessions = await prisma.whatsAppSession.findMany({
      where: { status: { in: ["connected", "connecting", "qr_ready"] } },
    });

    console.log(`Restoring ${sessions.length} WhatsApp sessions...`);

    for (const session of sessions) {
      try {
        await this.createSession(session.id);
        console.log(`Restored session ${session.id} (slot ${session.slot})`);
      } catch (err) {
        console.error(`Failed to restore session ${session.id}:`, err);
        await prisma.whatsAppSession.update({
          where: { id: session.id },
          data: { status: "disconnected" },
        });
      }
    }
  }

  private getSocket(sessionId: string): WASocket {
    const sock = this.sockets.get(sessionId);
    if (!sock) {
      throw new Error(`Session ${sessionId} not active`);
    }
    return sock;
  }

  private parseMessage(msg: WAMessage): MessageInfo | null {
    if (!msg.message || !msg.key.id) return null;

    const contentType = getContentType(msg.message);
    if (!contentType) return null;

    let content = "";
    let type: MessageInfo["type"] = "other";
    let caption: string | undefined;
    let mimetype: string | undefined;
    let filename: string | undefined;

    switch (contentType) {
      case "conversation":
        content = msg.message.conversation || "";
        type = "text";
        break;
      case "extendedTextMessage":
        content = msg.message.extendedTextMessage?.text || "";
        type = "text";
        break;
      case "imageMessage":
        caption = msg.message.imageMessage?.caption || undefined;
        mimetype = msg.message.imageMessage?.mimetype || undefined;
        content = caption || "[Image]";
        type = "image";
        break;
      case "videoMessage":
        caption = msg.message.videoMessage?.caption || undefined;
        mimetype = msg.message.videoMessage?.mimetype || undefined;
        content = caption || "[Video]";
        type = "video";
        break;
      case "audioMessage":
        mimetype = msg.message.audioMessage?.mimetype || undefined;
        content = "[Audio]";
        type = "audio";
        break;
      case "documentMessage":
        filename = msg.message.documentMessage?.fileName || undefined;
        mimetype = msg.message.documentMessage?.mimetype || undefined;
        content = filename || "[Document]";
        type = "document";
        break;
      case "stickerMessage":
        content = "[Sticker]";
        type = "sticker";
        break;
      default:
        content = `[${contentType}]`;
        type = "other";
    }

    // Handle quoted messages
    let quotedMessage: MessageInfo["quotedMessage"] | undefined;
    const quoted =
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted) {
      const quotedType = getContentType(quoted);
      quotedMessage = {
        id: msg.message?.extendedTextMessage?.contextInfo?.stanzaId || "",
        content:
          quoted?.conversation ||
          quoted?.extendedTextMessage?.text ||
          `[${quotedType}]`,
      };
    }

    return {
      id: msg.key.id!,
      chatId: msg.key.remoteJid || "",
      content,
      timestamp: msg.messageTimestamp
        ? typeof msg.messageTimestamp === "number"
          ? msg.messageTimestamp
          : msg.messageTimestamp.low
        : Date.now() / 1000,
      fromMe: msg.key.fromMe || false,
      senderName: msg.pushName || undefined,
      type,
      mimetype,
      filename,
      caption,
      quotedMessage,
    };
  }
}

export const sessionManager = new SessionManager();
```

**Step 2: Commit**

```bash
git add services/whatsapp-bridge/src/session-manager.ts
git commit -m "feat(wa-bridge): implement Baileys session manager with QR, messaging, and Redis pub/sub"
```

---

### Task 6: Implement Express API routes

**Files:**
- Create: `services/whatsapp-bridge/src/middleware/auth.ts`
- Create: `services/whatsapp-bridge/src/routes/health.ts`
- Create: `services/whatsapp-bridge/src/routes/sessions.ts`
- Create: `services/whatsapp-bridge/src/routes/messages.ts`

**Step 1: Create auth middleware**

```typescript
import { Request, Response, NextFunction } from "express";
import { config } from "../config";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-api-key"];
  if (!key || key !== config.apiKey) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  next();
}
```

**Step 2: Create health route**

```typescript
import { Router } from "express";
import { sessionManager } from "../session-manager";

const router = Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    activeSessions: sessionManager.getActiveSessionCount(),
    uptime: process.uptime(),
  });
});

export default router;
```

**Step 3: Create sessions route**

```typescript
import { Router } from "express";
import { prisma } from "../prisma";
import { sessionManager } from "../session-manager";
import { config } from "../config";

const router = Router();

// Create a new session and start QR flow
router.post("/sessions", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    // Verify the session exists in DB
    const session = await prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    await sessionManager.createSession(sessionId);
    res.json({ success: true, sessionId });
  } catch (err: any) {
    console.error("Create session error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete/disconnect a session
router.delete("/sessions/:id", async (req, res) => {
  try {
    await sessionManager.destroySession(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Destroy session error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get session status
router.get("/sessions/:id/status", async (req, res) => {
  try {
    const session = await prisma.whatsAppSession.findUnique({
      where: { id: req.params.id },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({
      id: session.id,
      status: session.status,
      phone: session.phone,
      displayName: session.displayName,
      socketActive: sessionManager.getStatus(session.id) === "active",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Request pairing code (alternative to QR)
router.post("/sessions/:id/pairing-code", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "phone is required" });
    }

    const code = await sessionManager.getPairingCode(req.params.id, phone);
    res.json({ success: true, code });
  } catch (err: any) {
    console.error("Pairing code error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

**Step 4: Create messages route**

```typescript
import { Router } from "express";
import multer from "multer";
import { sessionManager } from "../session-manager";

const router = Router();
const upload = multer({ limits: { fileSize: 16 * 1024 * 1024 } }); // 16MB limit

// Get chats for a session
router.get("/sessions/:id/chats", async (req, res) => {
  try {
    const chats = await sessionManager.getChats(req.params.id);
    res.json({ chats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages for a chat
router.get("/sessions/:id/chats/:chatId/messages", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = await sessionManager.getMessages(
      req.params.id,
      req.params.chatId,
      limit
    );
    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send text message
router.post("/sessions/:id/send/text", async (req, res) => {
  try {
    const { chatId, text } = req.body;
    if (!chatId || !text) {
      return res.status(400).json({ error: "chatId and text are required" });
    }

    const result = await sessionManager.sendText(req.params.id, chatId, text);
    res.json({ success: true, messageId: result.key.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send media (image, video, document)
router.post("/sessions/:id/send/media", upload.single("file"), async (req, res) => {
  try {
    const { chatId, caption } = req.body;
    const file = req.file;

    if (!chatId || !file) {
      return res.status(400).json({ error: "chatId and file are required" });
    }

    const result = await sessionManager.sendMedia(
      req.params.id,
      chatId,
      file.buffer,
      file.mimetype,
      file.originalname,
      caption
    );
    res.json({ success: true, messageId: result.key.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send audio/voice note
router.post("/sessions/:id/send/audio", upload.single("audio"), async (req, res) => {
  try {
    const { chatId } = req.body;
    const file = req.file;

    if (!chatId || !file) {
      return res.status(400).json({ error: "chatId and audio file are required" });
    }

    const result = await sessionManager.sendAudio(
      req.params.id,
      chatId,
      file.buffer
    );
    res.json({ success: true, messageId: result.key.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

**Step 5: Commit**

```bash
git add services/whatsapp-bridge/src/middleware/ services/whatsapp-bridge/src/routes/
git commit -m "feat(wa-bridge): add Express routes for sessions, messages, and health"
```

---

### Task 7: Implement the Express + WebSocket server entry point

**Files:**
- Create: `services/whatsapp-bridge/src/index.ts`

**Step 1: Create the main server file**

```typescript
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

import { config } from "./config";
import { apiKeyAuth } from "./middleware/auth";
import { sessionManager } from "./session-manager";
import { getSubscriber, cleanup } from "./redis";
import healthRouter from "./routes/health";
import sessionsRouter from "./routes/sessions";
import messagesRouter from "./routes/messages";

const app = express();
app.use(cors());
app.use(express.json());

// Health check (no auth)
app.use(healthRouter);

// All other routes require API key
app.use(apiKeyAuth);
app.use(sessionsRouter);
app.use(messagesRouter);

const server = createServer(app);

// WebSocket server for real-time events
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws: WebSocket, req) => {
  // Validate API key from query param
  const url = new URL(req.url || "", `http://localhost:${config.port}`);
  const apiKey = url.searchParams.get("apiKey");

  if (apiKey !== config.apiKey) {
    ws.close(4001, "Invalid API key");
    return;
  }

  // Client sends subscription messages like:
  // { type: "subscribe", sessionId: "xxx" }
  // { type: "unsubscribe", sessionId: "xxx" }
  const subscriptions = new Set<string>();
  const subscriber = getSubscriber();

  const messageHandler = (channel: string, message: string) => {
    // Forward to client if they're subscribed to this session
    for (const sessionId of subscriptions) {
      if (
        channel === `wa:qr:${sessionId}` ||
        channel === `wa:status:${sessionId}` ||
        channel === `wa:msg:${sessionId}`
      ) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ channel, data: JSON.parse(message) }));
        }
      }
    }
  };

  subscriber.on("message", messageHandler);

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "subscribe" && msg.sessionId) {
        subscriptions.add(msg.sessionId);
        await subscriber.subscribe(
          `wa:qr:${msg.sessionId}`,
          `wa:status:${msg.sessionId}`,
          `wa:msg:${msg.sessionId}`
        );
      }

      if (msg.type === "unsubscribe" && msg.sessionId) {
        subscriptions.delete(msg.sessionId);
        await subscriber.unsubscribe(
          `wa:qr:${msg.sessionId}`,
          `wa:status:${msg.sessionId}`,
          `wa:msg:${msg.sessionId}`
        );
      }
    } catch {
      // Ignore malformed messages
    }
  });

  ws.on("close", async () => {
    subscriber.removeListener("message", messageHandler);
    for (const sessionId of subscriptions) {
      await subscriber.unsubscribe(
        `wa:qr:${sessionId}`,
        `wa:status:${sessionId}`,
        `wa:msg:${sessionId}`
      ).catch(() => {});
    }
    subscriptions.clear();
  });
});

// Startup
async function start() {
  console.log(`WhatsApp Bridge starting on port ${config.port}...`);

  // Restore previously connected sessions
  await sessionManager.restoreAllSessions();

  server.listen(config.port, () => {
    console.log(`WhatsApp Bridge running on http://localhost:${config.port}`);
    console.log(`WebSocket available at ws://localhost:${config.port}/ws`);
  });
}

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down WhatsApp Bridge...");
  await cleanup();
  server.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start().catch((err) => {
  console.error("Failed to start WhatsApp Bridge:", err);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add services/whatsapp-bridge/src/index.ts
git commit -m "feat(wa-bridge): add Express + WebSocket server entry point with Redis subscriptions"
```

---

## Phase 3: Next.js API Routes (Proxy Layer)

### Task 8: Add environment variables and bridge client helper

**Files:**
- Modify: `.env.local` (add new vars — user will do manually)
- Create: `lib/whatsapp-bridge.ts`

**Step 1: Document required env vars**

The user needs to add to `.env.local`:

```env
WHATSAPP_BRIDGE_URL=http://localhost:3001
WHATSAPP_BRIDGE_API_KEY=your-shared-secret
REDIS_URL=redis://localhost:6379
```

**Step 2: Create bridge client helper**

```typescript
// lib/whatsapp-bridge.ts

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || "http://localhost:3001";
const BRIDGE_API_KEY = process.env.WHATSAPP_BRIDGE_API_KEY || "";

interface BridgeRequestOptions {
  method?: string;
  body?: unknown;
  formData?: FormData;
}

export async function bridgeRequest<T = unknown>(
  path: string,
  options: BridgeRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, formData } = options;

  const headers: Record<string, string> = {
    "x-api-key": BRIDGE_API_KEY,
  };

  let fetchBody: BodyInit | undefined;

  if (formData) {
    fetchBody = formData;
    // Don't set Content-Type for FormData (browser sets boundary)
  } else if (body) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  const res = await fetch(`${BRIDGE_URL}${path}`, {
    method,
    headers,
    body: fetchBody,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `Bridge request failed: ${res.status}`);
  }

  return res.json() as T;
}

export function getBridgeWebSocketUrl(): string {
  const wsUrl = BRIDGE_URL.replace(/^http/, "ws");
  return `${wsUrl}/ws?apiKey=${encodeURIComponent(BRIDGE_API_KEY)}`;
}
```

**Step 3: Commit**

```bash
git add lib/whatsapp-bridge.ts
git commit -m "feat(wa-inbox): add whatsapp-bridge HTTP client helper"
```

---

### Task 9: Create Next.js API routes for WhatsApp inbox sessions

**Files:**
- Create: `app/api/integrations/whatsapp-inbox/sessions/route.ts`
- Create: `app/api/integrations/whatsapp-inbox/sessions/[sessionId]/route.ts`

**Step 1: Create sessions list + create route**

```typescript
// app/api/integrations/whatsapp-inbox/sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/app/generated/prisma";
import { bridgeRequest } from "@/lib/whatsapp-bridge";

// GET: List user's WhatsApp sessions
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookieStore.toString() }),
    });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await prisma.whatsAppSession.findMany({
      where: { userId: session.user.id },
      orderBy: { slot: "asc" },
    });

    return NextResponse.json({ sessions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new WhatsApp session (start QR flow)
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authSession = await auth.api.getSession({
      headers: new Headers({ cookie: cookieStore.toString() }),
    });
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slot } = await req.json();

    if (!slot || slot < 1 || slot > 3) {
      return NextResponse.json(
        { error: "Slot must be 1, 2, or 3" },
        { status: 400 }
      );
    }

    // Check if slot is already taken
    const existing = await prisma.whatsAppSession.findUnique({
      where: { userId_slot: { userId: authSession.user.id, slot } },
    });

    if (existing && existing.status === "connected") {
      return NextResponse.json(
        { error: "Slot already connected" },
        { status: 409 }
      );
    }

    // Create or reuse session record
    const waSession = existing
      ? await prisma.whatsAppSession.update({
          where: { id: existing.id },
          data: { status: "connecting" },
        })
      : await prisma.whatsAppSession.create({
          data: {
            userId: authSession.user.id,
            slot,
            status: "connecting",
          },
        });

    // Tell bridge to start the Baileys session
    await bridgeRequest("/sessions", {
      method: "POST",
      body: { sessionId: waSession.id },
    });

    return NextResponse.json({ session: waSession });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 2: Create single session route (status + delete)**

```typescript
// app/api/integrations/whatsapp-inbox/sessions/[sessionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/app/generated/prisma";
import { bridgeRequest } from "@/lib/whatsapp-bridge";

// GET: Session status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authSession = await auth.api.getSession({
      headers: new Headers({ cookie: cookieStore.toString() }),
    });
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const waSession = await prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
    });

    if (!waSession || waSession.userId !== authSession.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ session: waSession });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Disconnect session
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authSession = await auth.api.getSession({
      headers: new Headers({ cookie: cookieStore.toString() }),
    });
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const waSession = await prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
    });

    if (!waSession || waSession.userId !== authSession.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Tell bridge to destroy the session
    await bridgeRequest(`/sessions/${sessionId}`, { method: "DELETE" });

    // Delete the DB record
    await prisma.whatsAppSession.delete({ where: { id: sessionId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add app/api/integrations/whatsapp-inbox/
git commit -m "feat(wa-inbox): add Next.js API routes for WhatsApp session management"
```

---

### Task 10: Create Next.js API routes for WhatsApp messages (chats, send, media, audio)

**Files:**
- Create: `app/api/integrations/whatsapp-inbox/sessions/[sessionId]/chats/route.ts`
- Create: `app/api/integrations/whatsapp-inbox/sessions/[sessionId]/messages/route.ts`
- Create: `app/api/integrations/whatsapp-inbox/sessions/[sessionId]/send-media/route.ts`
- Create: `app/api/integrations/whatsapp-inbox/sessions/[sessionId]/send-audio/route.ts`

**Step 1: Create chats route**

```typescript
// app/api/integrations/whatsapp-inbox/sessions/[sessionId]/chats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/app/generated/prisma";
import { bridgeRequest } from "@/lib/whatsapp-bridge";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authSession = await auth.api.getSession({
      headers: new Headers({ cookie: cookieStore.toString() }),
    });
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const waSession = await prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
    });
    if (!waSession || waSession.userId !== authSession.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = await bridgeRequest<{ chats: unknown[] }>(
      `/sessions/${sessionId}/chats`
    );

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 2: Create messages route (GET messages + POST send text)**

```typescript
// app/api/integrations/whatsapp-inbox/sessions/[sessionId]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/app/generated/prisma";
import { bridgeRequest } from "@/lib/whatsapp-bridge";

// GET: Fetch messages for a chat
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const chatId = req.nextUrl.searchParams.get("chatId");
    const limit = req.nextUrl.searchParams.get("limit") || "50";

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authSession = await auth.api.getSession({
      headers: new Headers({ cookie: cookieStore.toString() }),
    });
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const waSession = await prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
    });
    if (!waSession || waSession.userId !== authSession.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = await bridgeRequest<{ messages: unknown[] }>(
      `/sessions/${sessionId}/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}`
    );

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Send text message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authSession = await auth.api.getSession({
      headers: new Headers({ cookie: cookieStore.toString() }),
    });
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const waSession = await prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
    });
    if (!waSession || waSession.userId !== authSession.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { chatId, text } = await req.json();

    const data = await bridgeRequest(`/sessions/${sessionId}/send/text`, {
      method: "POST",
      body: { chatId, text },
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 3: Create send-media route**

```typescript
// app/api/integrations/whatsapp-inbox/sessions/[sessionId]/send-media/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/app/generated/prisma";

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || "http://localhost:3001";
const BRIDGE_API_KEY = process.env.WHATSAPP_BRIDGE_API_KEY || "";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authSession = await auth.api.getSession({
      headers: new Headers({ cookie: cookieStore.toString() }),
    });
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const waSession = await prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
    });
    if (!waSession || waSession.userId !== authSession.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Forward the multipart form data directly to bridge
    const formData = await req.formData();

    const res = await fetch(`${BRIDGE_URL}/sessions/${sessionId}/send/media`, {
      method: "POST",
      headers: { "x-api-key": BRIDGE_API_KEY },
      body: formData,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 4: Create send-audio route**

```typescript
// app/api/integrations/whatsapp-inbox/sessions/[sessionId]/send-audio/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/app/generated/prisma";

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || "http://localhost:3001";
const BRIDGE_API_KEY = process.env.WHATSAPP_BRIDGE_API_KEY || "";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authSession = await auth.api.getSession({
      headers: new Headers({ cookie: cookieStore.toString() }),
    });
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const waSession = await prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
    });
    if (!waSession || waSession.userId !== authSession.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const formData = await req.formData();

    const res = await fetch(`${BRIDGE_URL}/sessions/${sessionId}/send/audio`, {
      method: "POST",
      headers: { "x-api-key": BRIDGE_API_KEY },
      body: formData,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 5: Commit**

```bash
git add app/api/integrations/whatsapp-inbox/
git commit -m "feat(wa-inbox): add chat listing, message fetching, and send routes"
```

---

## Phase 4: Frontend — Settings + Connection Flow

### Task 11: Create WhatsAppConnectModal component

**Files:**
- Create: `components/integrations/WhatsAppConnectModal.tsx`

**Step 1: Implement the connect modal with QR + pairing code tabs**

This component opens when the user clicks "Connect" on a WhatsApp slot. It:
- Opens a WebSocket to the bridge (via Next.js proxy or directly)
- Shows a live-updating QR code
- Offers a "Pairing Code" tab as an alternative
- Closes with success when connected

```typescript
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, QrCode, Keyboard, CheckCircle2, WifiOff } from "lucide-react";

interface WhatsAppConnectModalProps {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
  sessionId: string | null;
  slot: number;
}

type Tab = "qr" | "pairing";

export function WhatsAppConnectModal({
  open,
  onClose,
  onConnected,
  sessionId,
  slot,
}: WhatsAppConnectModalProps) {
  const [tab, setTab] = useState<Tab>("qr");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("connecting");
  const [pairingPhone, setPairingPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket connection for real-time QR + status updates
  useEffect(() => {
    if (!open || !sessionId) return;

    const bridgeWsUrl = process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL;
    if (!bridgeWsUrl) return;

    const ws = new WebSocket(bridgeWsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", sessionId }));
    };

    ws.onmessage = (event) => {
      try {
        const { channel, data } = JSON.parse(event.data);

        if (channel === `wa:qr:${sessionId}`) {
          setQrImage(data.qr);
          setStatus("qr_ready");
        }

        if (channel === `wa:status:${sessionId}`) {
          setStatus(data.status);
          if (data.status === "connected") {
            setTimeout(() => {
              onConnected();
              onClose();
            }, 1500);
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onerror = () => setStatus("error");
    ws.onclose = () => {};

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [open, sessionId, onConnected, onClose]);

  const requestPairingCode = async () => {
    if (!sessionId || !pairingPhone) return;
    setPairingLoading(true);
    try {
      const res = await fetch(
        `/api/integrations/whatsapp-inbox/sessions/${sessionId}/pairing-code`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: pairingPhone }),
        }
      );
      const data = await res.json();
      if (data.code) {
        setPairingCode(data.code);
      }
    } catch {
      // Handle error
    } finally {
      setPairingLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect WhatsApp (Slot {slot})</DialogTitle>
        </DialogHeader>

        {status === "connected" ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <p className="text-lg font-medium text-green-700">Connected!</p>
          </div>
        ) : (
          <>
            {/* Tab switcher */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={tab === "qr" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("qr")}
              >
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </Button>
              <Button
                variant={tab === "pairing" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("pairing")}
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Pairing Code
              </Button>
            </div>

            {tab === "qr" && (
              <div className="flex flex-col items-center gap-4">
                {qrImage ? (
                  <>
                    <img
                      src={qrImage}
                      alt="WhatsApp QR Code"
                      className="w-64 h-64 rounded-lg border"
                    />
                    <p className="text-sm text-gray-500 text-center">
                      Open WhatsApp on your phone, go to Settings &gt; Linked
                      Devices &gt; Link a Device, then scan this QR code.
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    <p className="text-sm text-gray-500">Generating QR code...</p>
                  </div>
                )}
              </div>
            )}

            {tab === "pairing" && (
              <div className="flex flex-col gap-4">
                {!pairingCode ? (
                  <>
                    <p className="text-sm text-gray-600">
                      Enter your WhatsApp phone number to get a pairing code.
                    </p>
                    <Input
                      placeholder="+1234567890"
                      value={pairingPhone}
                      onChange={(e) => setPairingPhone(e.target.value)}
                    />
                    <Button
                      onClick={requestPairingCode}
                      disabled={!pairingPhone || pairingLoading}
                    >
                      {pairingLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Get Pairing Code
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Enter this code in WhatsApp: Settings &gt; Linked Devices
                      &gt; Link a Device &gt; Link with Phone Number
                    </p>
                    <div className="text-3xl font-mono font-bold text-center tracking-widest py-4">
                      {pairingCode}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add components/integrations/WhatsAppConnectModal.tsx
git commit -m "feat(wa-inbox): add WhatsAppConnectModal with QR code and pairing code tabs"
```

---

### Task 12: Add WhatsApp Inbox section to integrations settings page

**Files:**
- Modify: `app/(app)/settings/integrations/page.tsx` (add WhatsApp Inbox section after line ~486)
- Modify: `lib/config/platforms.ts` (uncomment WhatsApp, lines 46-53)

**Step 1: Uncomment WhatsApp in platforms config**

In `lib/config/platforms.ts`, uncomment lines 46-53 to re-enable the WhatsApp platform entry.

**Step 2: Add WhatsApp Inbox section to settings page**

Add a new section in the integrations page between the "Communication Platforms" section (line ~486) and the "Security Info" card (line ~488). This section displays 3 slot cards showing connection status, with connect/disconnect buttons. It imports and uses `WhatsAppConnectModal`.

Key UI elements:
- Section header: "WhatsApp Inbox" with description "Connect up to 3 WhatsApp numbers to receive and reply to DMs"
- 3 cards (one per slot), each showing:
  - If connected: phone number, display name, profile pic, "Disconnect" button
  - If disconnected: "Connect" button that opens WhatsAppConnectModal
  - If connecting: spinner with status text
- Uses `useQuery` to poll `/api/integrations/whatsapp-inbox/sessions` for session state
- Refetches when modal closes after successful connection

**Step 3: Commit**

```bash
git add app/(app)/settings/integrations/page.tsx lib/config/platforms.ts
git commit -m "feat(wa-inbox): add WhatsApp Inbox section to integrations settings page"
```

---

## Phase 5: Frontend — Unified Inbox Integration

### Task 13: Create WhatsApp chat list and message components

**Files:**
- Create: `components/messages/WhatsAppChatList.tsx`
- Create: `components/messages/WhatsAppMessageView.tsx`
- Create: `components/messages/WhatsAppReplyComposer.tsx`

**Step 1: WhatsAppChatList component**

Fetches chats from all connected sessions, merges and sorts by recency. Shows contact name/phone, last message preview, unread count, and which connected number received it.

**Step 2: WhatsAppMessageView component**

Displays the message thread for a selected chat. Renders text, images, audio players, document download links. Shows sent/received bubbles with timestamps.

**Step 3: WhatsAppReplyComposer component**

Text input with:
- Send button for text messages
- File attachment button (triggers file picker, calls send-media endpoint)
- Microphone button for voice recording (uses MediaRecorder API, records OGG Opus, calls send-audio endpoint)
- Session selector dropdown (if user has multiple numbers connected, pick which to reply from)

**Step 4: Commit**

```bash
git add components/messages/
git commit -m "feat(wa-inbox): add WhatsApp chat list, message view, and reply composer components"
```

---

### Task 14: Integrate WhatsApp into the messages page

**Files:**
- Modify: `app/(app)/messages/page.tsx`

**Step 1: Add WhatsApp live-fetch when WhatsApp filter is active**

The messages page already has a WHATSAPP channel in its filter (line 34). When the WhatsApp channel filter is active, instead of (or in addition to) fetching from the `/api/messages` DB endpoint, also fetch from `/api/integrations/whatsapp-inbox/sessions` to get live WhatsApp chats.

Key changes:
- When WhatsApp filter is selected, show a split view: WhatsApp chat list on the left, message thread on the right
- Use `WhatsAppChatList` component for the left panel
- Use `WhatsAppMessageView` + `WhatsAppReplyComposer` for the right panel
- If no WhatsApp sessions are connected, show a prompt to connect in settings

**Step 2: Commit**

```bash
git add app/(app)/messages/page.tsx
git commit -m "feat(wa-inbox): integrate WhatsApp live-fetch into unified messages page"
```

---

## Phase 6: Onboarding Update

### Task 15: Add WhatsApp phone number step to onboarding flow

**Files:**
- Modify: `components/onboarding/OnboardingFlow.tsx` (add step between use-case and integrations)

**Step 1: Add formData field**

Add `whatsappPhone: ""` to the `formData` state object (line 37-42).

**Step 2: Add new onboarding step**

Insert a new step after the "use-case" step (index 1) and before the "integrations" step (index 2). The new step asks "What's your WhatsApp number?" with:
- Phone input with placeholder "+1 234 567 890"
- Helper text: "We use this to connect you with AYA, your AI assistant on WhatsApp."
- "Skip for now" note at the bottom

**Step 3: Update handleComplete to save phone**

In `handleComplete` (line 267), after the onboarding POST, if `formData.whatsappPhone` is not empty, call:

```typescript
await fetch("/api/users/update-phone", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId,
    whatsappPhone: formData.whatsappPhone,
  }),
});
```

**Step 4: Create the phone update API route**

Create `app/api/users/update-phone/route.ts` that validates the session, then updates `User.whatsappPhone` via Prisma.

**Step 5: Update canProceed**

The new step should return `true` (phone is optional / skippable).

**Step 6: Commit**

```bash
git add components/onboarding/OnboardingFlow.tsx app/api/users/update-phone/route.ts
git commit -m "feat(onboarding): add WhatsApp phone number collection step"
```

---

## Phase 7: Pairing Code API Route

### Task 16: Add pairing code proxy route

**Files:**
- Create: `app/api/integrations/whatsapp-inbox/sessions/[sessionId]/pairing-code/route.ts`

**Step 1: Create pairing code route**

Same auth pattern as other session routes. Proxies to bridge `/sessions/:id/pairing-code` with the phone number.

```typescript
// POST: Request pairing code
// Body: { phone: "+1234567890" }
// Returns: { code: "ABCD-EFGH" }
```

**Step 2: Commit**

```bash
git add app/api/integrations/whatsapp-inbox/sessions/
git commit -m "feat(wa-inbox): add pairing code proxy route"
```

---

## Phase 8: Install Dependencies + Final Wiring

### Task 17: Install dependencies and add ioredis to Next.js

**Step 1: Install ioredis in the Next.js project**

```bash
npm install ioredis
```

This is needed for the WebSocket proxy route in Next.js to subscribe to Redis Pub/Sub channels.

**Step 2: Install bridge service dependencies**

```bash
cd services/whatsapp-bridge && npm install
```

**Step 3: Generate Prisma client for bridge**

```bash
cd services/whatsapp-bridge && npx prisma generate --schema=prisma/schema.prisma
```

**Step 4: Add `NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL` to env**

The frontend needs to know the WebSocket URL. Add to `.env.local`:

```env
NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL=ws://localhost:3001/ws?apiKey=your-key
```

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(wa-inbox): install ioredis for Redis pub/sub support"
```

---

## Task Summary

| Phase | Task | Description |
|-------|------|-------------|
| 1 | 1 | Prisma schema: WhatsAppSession + WhatsAppAuth models |
| 2 | 2 | Scaffold whatsapp-bridge microservice |
| 2 | 3 | Prisma client + Redis for bridge |
| 2 | 4 | Baileys PostgreSQL auth store |
| 2 | 5 | Session Manager (core Baileys logic) |
| 2 | 6 | Express API routes (sessions, messages, health) |
| 2 | 7 | Express + WebSocket server entry point |
| 3 | 8 | Bridge client helper for Next.js |
| 3 | 9 | Next.js API: session CRUD routes |
| 3 | 10 | Next.js API: chat/message/send routes |
| 4 | 11 | WhatsAppConnectModal component |
| 4 | 12 | Integrations settings page: WhatsApp section |
| 5 | 13 | Chat list, message view, reply composer components |
| 5 | 14 | Messages page: WhatsApp integration |
| 6 | 15 | Onboarding: phone number step |
| 7 | 16 | Pairing code proxy route |
| 8 | 17 | Install deps + final wiring |
