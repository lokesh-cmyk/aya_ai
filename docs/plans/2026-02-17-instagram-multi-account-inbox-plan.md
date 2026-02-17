# Instagram Multi-Account Unified Inbox Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow end users to connect up to 3 Instagram Business/Creator accounts via Composio and view + reply to DMs from all accounts in the unified inbox, backed by an Inngest sync worker and Upstash Redis cache.

**Architecture:** Extend Composio's multi-account support (`allowMultiple: true`) for Instagram. An Inngest cron job syncs DMs from all connected accounts every 3 minutes into Upstash Redis. The inbox API reads from Redis (fast) instead of hitting Composio directly. A new reply endpoint routes outbound messages to the correct account via `connectedAccountId`.

**Tech Stack:** Composio SDK (`@composio/core`), Upstash Redis (`@upstash/redis`), Inngest, Next.js API routes, React Query, Tailwind CSS

**Design Doc:** `docs/plans/2026-02-17-instagram-multi-account-inbox-design.md`

---

### Task 1: Install Upstash Redis and Create Client

**Files:**
- Create: `lib/redis.ts`
- Modify: `.env.example`
- Modify: `package.json` (via npm install)

**Step 1: Install @upstash/redis**

Run: `npm install @upstash/redis`
Expected: Package added to package.json dependencies

**Step 2: Create Redis client**

Create `lib/redis.ts`:

```typescript
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set");
    }
    redis = new Redis({ url, token });
  }
  return redis;
}
```

**Step 3: Add env vars to .env.example**

Append to `.env.example` after the WAHA section (line 71):

```env
# Upstash Redis (for Instagram DM sync cache)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

**Step 4: Commit**

```bash
git add lib/redis.ts .env.example package.json package-lock.json
git commit -m "feat(instagram): add Upstash Redis client for DM sync cache"
```

---

### Task 2: Update Composio Connect Route for Multi-Account

**Files:**
- Modify: `app/api/integrations/composio/connect/route.ts`

**Step 1: Add allowMultiple support**

The connect route at line 49 calls `composio.connectedAccounts.link()` without `allowMultiple`. We need to:
1. Check how many Instagram accounts the user already has
2. If they have 1+, pass `allowMultiple: true`
3. If they have 3, reject the request

Replace the section from line 43 to line 59 with logic that:
- For Instagram specifically, counts existing ACTIVE connections
- Enforces max 3 limit
- Passes `allowMultiple: true` when user already has a connection

```typescript
const composio = getComposio();
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
const callbackUrl = shouldRedirect ? `${baseUrl}/ai-chat` : getIntegrationsCallbackUrl();

// For Instagram: check existing connections and enforce max 3 limit
let allowMultiple = false;
if (app === "instagram") {
  const existing = await composio.connectedAccounts.list({
    userIds: [session.user.id],
    statuses: ["ACTIVE"],
    toolkitSlugs: [config.slug],
  });
  const existingCount = ((existing as any).items ?? []).length;
  if (existingCount >= 3) {
    if (shouldRedirect) {
      return NextResponse.redirect(new URL("/settings/integrations?error=instagram_max_accounts", request.url));
    }
    return NextResponse.json({ error: "Maximum 3 Instagram accounts allowed" }, { status: 400 });
  }
  if (existingCount > 0) {
    allowMultiple = true;
  }
}

const linkOptions: any = { callbackUrl };
if (allowMultiple) {
  linkOptions.allowMultiple = true;
}
const connectionRequest = await composio.connectedAccounts.link(session.user.id, config.authConfigId, linkOptions);
```

**Step 2: Commit**

```bash
git add app/api/integrations/composio/connect/route.ts
git commit -m "feat(instagram): support multi-account connect with allowMultiple and max 3 limit"
```

---

### Task 3: Update Composio Status Route for Multi-Account

**Files:**
- Modify: `app/api/integrations/composio/status/route.ts`

**Step 1: Return account arrays for Instagram**

Currently returns `{ instagram: true/false }`. Change to return an array of connected Instagram accounts with their `connectedAccountId` and any available metadata (username), while keeping backward compatibility for other apps.

Replace the entire route handler:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getComposio, COMPOSIO_APPS } from "@/lib/composio-tools";

interface InstagramAccount {
  id: string;
  username?: string;
  status: string;
}

/** GET - Returns Composio connection status. Instagram returns array of accounts; others return boolean. */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ googleCalendar: false, clickUp: false, instagram: [], linkedin: false });
    }

    const composio = getComposio();
    const list = await composio.connectedAccounts.list({
      userIds: [session.user.id],
      statuses: ["ACTIVE"],
      toolkitSlugs: [
        COMPOSIO_APPS.googlecalendar.slug,
        COMPOSIO_APPS.clickup.slug,
        COMPOSIO_APPS.instagram.slug,
        COMPOSIO_APPS.linkedin.slug,
      ],
    });

    const items = (list as { items?: Array<any> }).items ?? [];

    // Separate Instagram accounts (multi-account) from others (boolean)
    const instagramAccounts: InstagramAccount[] = [];
    const otherSlugs = new Set<string>();

    for (const item of items) {
      const slug = (item.toolkit?.slug ?? item.toolkitSlug ?? "").toLowerCase();
      if (slug === COMPOSIO_APPS.instagram.slug.toLowerCase()) {
        instagramAccounts.push({
          id: item.id,
          username: item.metadata?.username || item.connectionParams?.username || undefined,
          status: item.status || "ACTIVE",
        });
      } else if (slug) {
        otherSlugs.add(slug);
      }
    }

    return NextResponse.json({
      googleCalendar: otherSlugs.has(COMPOSIO_APPS.googlecalendar.slug.toLowerCase()),
      clickUp: otherSlugs.has(COMPOSIO_APPS.clickup.slug.toLowerCase()),
      instagram: instagramAccounts,
      linkedin: otherSlugs.has(COMPOSIO_APPS.linkedin.slug.toLowerCase()),
    });
  } catch (e) {
    console.warn("[composio/status]", e);
    return NextResponse.json({ googleCalendar: false, clickUp: false, instagram: [], linkedin: false });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/integrations/composio/status/route.ts
git commit -m "feat(instagram): return multi-account array in status route"
```

---

### Task 4: Create Composio Disconnect Route

**Files:**
- Create: `app/api/integrations/composio/disconnect/route.ts`

**Step 1: Create the disconnect endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getComposio } from "@/lib/composio-tools";

/** DELETE ?connectedAccountId=ca_xxx - Disconnect a specific Composio connected account */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connectedAccountId = request.nextUrl.searchParams.get("connectedAccountId");
    if (!connectedAccountId) {
      return NextResponse.json({ error: "connectedAccountId is required" }, { status: 400 });
    }

    const composio = getComposio();

    // Verify the account belongs to this user
    const list = await composio.connectedAccounts.list({
      userIds: [session.user.id],
      statuses: ["ACTIVE"],
    });
    const items = (list as { items?: Array<any> }).items ?? [];
    const account = items.find((item: any) => item.id === connectedAccountId);
    if (!account) {
      return NextResponse.json({ error: "Connected account not found" }, { status: 404 });
    }

    // Delete the connection via Composio
    await composio.connectedAccounts.delete(connectedAccountId);

    // Clear Redis cache for this account
    try {
      const { getRedis } = await import("@/lib/redis");
      const redis = getRedis();
      await redis.del(`instagram:messages:${session.user.id}:${connectedAccountId}`);
    } catch {
      // Redis not configured or unavailable — non-fatal
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[composio/disconnect]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to disconnect" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/integrations/composio/disconnect/route.ts
git commit -m "feat(instagram): add Composio disconnect route for individual accounts"
```

---

### Task 5: Create Inngest Instagram DM Sync Worker

**Files:**
- Create: `lib/inngest/functions/instagram-dm-sync.ts`
- Modify: `app/api/inngest/route.ts` (register the function)

**Step 1: Create the sync function**

```typescript
import { inngest } from "@/lib/inngest/client";
import { getComposio, COMPOSIO_APPS } from "@/lib/composio-tools";
import { getRedis } from "@/lib/redis";

const SYNC_INTERVAL_CRON = "*/3 * * * *"; // Every 3 minutes
const CACHE_TTL_SECONDS = 600; // 10 minutes

/**
 * Instagram DM Sync Worker
 * Fetches DMs from all connected Instagram accounts and caches in Redis.
 */
export const syncInstagramDMs = inngest.createFunction(
  {
    id: "instagram-dm-sync",
    name: "Instagram DM Sync",
    concurrency: { limit: 1 }, // Only one sync at a time
  },
  [
    { cron: SYNC_INTERVAL_CRON },
    { event: "instagram/sync.requested" },
  ],
  async ({ step, logger }) => {
    const composio = getComposio();
    const redis = getRedis();

    // Step 1: Get all users with active Instagram connections
    const connections = await step.run("list-instagram-connections", async () => {
      const list = await composio.connectedAccounts.list({
        statuses: ["ACTIVE"],
        toolkitSlugs: [COMPOSIO_APPS.instagram.slug],
      });
      const items = (list as { items?: Array<any> }).items ?? [];
      // Group by userId
      const byUser = new Map<string, Array<{ id: string; username?: string }>>();
      for (const item of items) {
        const userId = item.member?.id || item.clientUniqueUserId || item.userId;
        if (!userId) continue;
        if (!byUser.has(userId)) byUser.set(userId, []);
        byUser.get(userId)!.push({
          id: item.id,
          username: item.metadata?.username || item.connectionParams?.username || undefined,
        });
      }
      return Object.fromEntries(byUser);
    });

    const userIds = Object.keys(connections);
    if (userIds.length === 0) {
      logger.info("No Instagram connections to sync");
      return { synced: 0 };
    }

    // Step 2: Sync each user's accounts
    let totalSynced = 0;

    for (const userId of userIds) {
      const accounts = connections[userId];

      await step.run(`sync-user-${userId}`, async () => {
        for (const account of accounts) {
          try {
            // Fetch conversations
            const convsResponse = await composio.tools.execute(
              "INSTAGRAM_LIST_ALL_CONVERSATIONS",
              {
                userId,
                connectedAccountId: account.id,
                arguments: {},
                dangerouslySkipVersionCheck: true,
              }
            );

            const raw = (convsResponse as any).data ?? convsResponse;
            const convList = Array.isArray(raw) ? raw : raw?.conversations ?? raw?.data ?? [];

            const contacts: any[] = [];

            for (const conv of (Array.isArray(convList) ? convList : [])) {
              const convId = conv.id ?? conv.conversation_id ?? conv.conversationId ?? String(conv);
              const participants = conv.participants ?? conv.users ?? [];
              const other = Array.isArray(participants)
                ? participants.find((p: any) => p?.username || p?.id) ?? participants[0]
                : null;
              const contactName =
                (typeof other === "object" && (other?.username ?? other?.name ?? other?.full_name)) ||
                (typeof conv === "object" && (conv.name ?? conv.title)) ||
                `Conversation ${convId}`;

              // Fetch messages
              let messages: any[] = [];
              try {
                const msgsResponse = await composio.tools.execute(
                  "INSTAGRAM_LIST_ALL_MESSAGES",
                  {
                    userId,
                    connectedAccountId: account.id,
                    arguments: { conversation_id: convId },
                    dangerouslySkipVersionCheck: true,
                  }
                );
                const msgRaw = (msgsResponse as any).data ?? msgsResponse;
                const msgList = Array.isArray(msgRaw) ? msgRaw : msgRaw?.messages ?? msgRaw?.data ?? [];
                messages = Array.isArray(msgList) ? msgList : [];
              } catch {
                // Skip this conversation's messages on error
              }

              const normalizedMessages = messages.map((msg: any) => {
                const fromId = msg.sender_id ?? msg.from?.id ?? msg.from?.username ?? msg.from;
                const fromName =
                  (typeof msg.from === "object" && (msg.from?.username ?? msg.from?.name)) ?? String(fromId);
                const content = msg.text ?? msg.message ?? msg.content ?? "";
                const msgId = msg.id ?? msg.message_id ?? `ig_${convId}_${fromId}_${Date.now()}`;
                const createdAt = msg.created_time ?? msg.created_at ?? msg.timestamp ?? new Date().toISOString();
                const isInbound = msg.direction !== "OUTBOUND" && msg.direction !== "outbound";

                return {
                  id: msgId,
                  content: content || "(attachment or media)",
                  channel: "INSTAGRAM" as const,
                  direction: isInbound ? "INBOUND" : "OUTBOUND",
                  status: "DELIVERED",
                  externalId: msg.id ?? msgId,
                  metadata: {
                    conversationId: convId,
                    senderId: fromId,
                    instagramMessageId: msg.id,
                    connectedAccountId: account.id,
                    accountUsername: account.username,
                  },
                  from: fromName,
                  createdAt: typeof createdAt === "string" ? createdAt : new Date(createdAt).toISOString(),
                  readAt: null,
                };
              });

              contacts.push({
                id: `instagram_${account.id}_${convId}`,
                name: contactName,
                email: undefined,
                phone: undefined,
                messages: normalizedMessages.sort(
                  (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ),
                _count: { messages: normalizedMessages.length },
                isInstagram: true,
                conversationId: convId,
                connectedAccountId: account.id,
                accountUsername: account.username,
              });
            }

            // Write to Redis
            await redis.set(
              `instagram:messages:${userId}:${account.id}`,
              JSON.stringify(contacts),
              { ex: CACHE_TTL_SECONDS }
            );

            // Update account metadata in Redis
            await redis.hset(`instagram:accounts:${userId}`, {
              [account.id]: JSON.stringify({ id: account.id, username: account.username, status: "ACTIVE" }),
            });
            await redis.expire(`instagram:accounts:${userId}`, CACHE_TTL_SECONDS);

            totalSynced++;
          } catch (err) {
            logger.warn(`Failed to sync Instagram account ${account.id} for user ${userId}`, { error: String(err) });
            // Continue with other accounts
          }
        }

        // Update last sync timestamp
        await redis.set(`instagram:sync:last:${userId}`, new Date().toISOString(), { ex: CACHE_TTL_SECONDS });
      });
    }

    return { synced: totalSynced, users: userIds.length };
  }
);
```

**Step 2: Register in Inngest route**

Add import and function to `app/api/inngest/route.ts`:

Import (after line 24):
```typescript
import { syncInstagramDMs } from "@/lib/inngest/functions/instagram-dm-sync";
```

Add to functions array (after line 50, before the closing bracket):
```typescript
    // Instagram DM sync
    syncInstagramDMs, // Cron: sync Instagram DMs to Redis cache
```

**Step 3: Commit**

```bash
git add lib/inngest/functions/instagram-dm-sync.ts app/api/inngest/route.ts
git commit -m "feat(instagram): add Inngest DM sync worker with Redis caching"
```

---

### Task 6: Update Instagram Messages Route to Read from Redis

**Files:**
- Modify: `app/api/integrations/instagram/messages/route.ts`

**Step 1: Rewrite to read from Redis cache with Composio fallback**

Replace the entire file:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getComposio, COMPOSIO_APPS } from "@/lib/composio-tools";

/** GET - Fetch Instagram DMs from Redis cache (synced by Inngest worker), fallback to direct Composio fetch */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ contacts: [], total: 0, messageCount: 0 });
    }

    // Try Redis cache first
    let allContacts: any[] = [];
    let fromCache = false;

    try {
      const { getRedis } = await import("@/lib/redis");
      const redis = getRedis();

      // Get all connected Instagram account IDs for this user
      const accountsMap = await redis.hgetall(`instagram:accounts:${session.user.id}`);

      if (accountsMap && Object.keys(accountsMap).length > 0) {
        // Fetch cached messages for each account
        const keys = Object.keys(accountsMap).map(
          (accountId) => `instagram:messages:${session.user.id}:${accountId}`
        );

        for (const key of keys) {
          const cached = await redis.get(key);
          if (cached) {
            const contacts = typeof cached === "string" ? JSON.parse(cached) : cached;
            if (Array.isArray(contacts)) {
              allContacts.push(...contacts);
            }
          }
        }

        if (allContacts.length > 0) {
          fromCache = true;
        }
      }
    } catch {
      // Redis not configured or unavailable — fall through to direct fetch
    }

    // Fallback: Direct Composio fetch (same as old behavior but for all accounts)
    if (!fromCache) {
      allContacts = await fetchFromComposioDirect(session.user.id);
    }

    // Sort all contacts by latest message
    allContacts.sort((a, b) => {
      const aTime = a.messages?.[0]?.createdAt ? new Date(a.messages[0].createdAt).getTime() : 0;
      const bTime = b.messages?.[0]?.createdAt ? new Date(b.messages[0].createdAt).getTime() : 0;
      return bTime - aTime;
    });

    const messageCount = allContacts.reduce((sum, c) => sum + (c.messages?.length ?? 0), 0);

    return NextResponse.json({
      contacts: allContacts,
      total: allContacts.length,
      messageCount,
      cached: fromCache,
    });
  } catch (e) {
    console.warn("[instagram/messages]", e);
    return NextResponse.json({ contacts: [], total: 0, messageCount: 0 });
  }
}

/** Direct Composio fetch fallback — fetches from ALL connected Instagram accounts */
async function fetchFromComposioDirect(userId: string): Promise<any[]> {
  const composio = getComposio();

  const list = await composio.connectedAccounts.list({
    userIds: [userId],
    statuses: ["ACTIVE"],
    toolkitSlugs: [COMPOSIO_APPS.instagram.slug],
  });
  const items = (list as { items?: Array<any> }).items ?? [];
  if (items.length === 0) return [];

  const allContacts: any[] = [];

  for (const account of items) {
    const connectedAccountId = account.id;
    const accountUsername = account.metadata?.username || account.connectionParams?.username || undefined;

    try {
      const conversationsResponse = await composio.tools.execute("INSTAGRAM_LIST_ALL_CONVERSATIONS", {
        userId,
        connectedAccountId,
        arguments: {},
        dangerouslySkipVersionCheck: true,
      });

      const raw = (conversationsResponse as any).data ?? conversationsResponse;
      const convList = Array.isArray(raw) ? raw : raw?.conversations ?? raw?.data ?? [];

      for (const conv of (Array.isArray(convList) ? convList : [])) {
        const convId = conv.id ?? conv.conversation_id ?? conv.conversationId ?? String(conv);
        const participants = conv.participants ?? conv.users ?? [];
        const other = Array.isArray(participants)
          ? participants.find((p: any) => p?.username || p?.id) ?? participants[0]
          : null;
        const contactName =
          (typeof other === "object" && (other?.username ?? other?.name ?? other?.full_name)) ||
          (typeof conv === "object" && (conv.name ?? conv.title)) ||
          `Conversation ${convId}`;

        let messagesResponse: any;
        try {
          messagesResponse = await composio.tools.execute("INSTAGRAM_LIST_ALL_MESSAGES", {
            userId,
            connectedAccountId,
            arguments: { conversation_id: convId },
            dangerouslySkipVersionCheck: true,
          });
        } catch {
          continue;
        }

        const msgRaw = (messagesResponse as any).data ?? messagesResponse;
        const msgList = Array.isArray(msgRaw) ? msgRaw : msgRaw?.messages ?? msgRaw?.data ?? [];
        const messages = Array.isArray(msgList) ? msgList : [];

        const normalizedMessages = messages.map((msg: any) => {
          const fromId = msg.sender_id ?? msg.from?.id ?? msg.from?.username ?? msg.from;
          const fromName =
            (typeof msg.from === "object" && (msg.from?.username ?? msg.from?.name)) ?? String(fromId);
          const content = msg.text ?? msg.message ?? msg.content ?? "";
          const msgId = msg.id ?? msg.message_id ?? `ig_${convId}_${fromId}_${Date.now()}`;
          const createdAt = msg.created_time ?? msg.created_at ?? msg.timestamp ?? new Date().toISOString();
          const isInbound = msg.direction !== "OUTBOUND" && msg.direction !== "outbound";

          return {
            id: msgId,
            content: content || "(attachment or media)",
            channel: "INSTAGRAM" as const,
            direction: isInbound ? "INBOUND" : "OUTBOUND",
            status: "DELIVERED",
            externalId: msg.id ?? msgId,
            metadata: {
              conversationId: convId,
              senderId: fromId,
              instagramMessageId: msg.id,
              connectedAccountId,
              accountUsername,
            },
            from: fromName,
            createdAt: typeof createdAt === "string" ? createdAt : new Date(createdAt).toISOString(),
            readAt: null,
          };
        });

        allContacts.push({
          id: `instagram_${connectedAccountId}_${convId}`,
          name: contactName,
          email: undefined,
          phone: undefined,
          messages: normalizedMessages.sort(
            (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),
          _count: { messages: normalizedMessages.length },
          isInstagram: true,
          conversationId: convId,
          connectedAccountId,
          accountUsername,
        });
      }
    } catch (err) {
      console.warn(`[instagram/messages] Failed to fetch from account ${connectedAccountId}:`, err);
      // Continue with other accounts
    }
  }

  return allContacts;
}
```

**Step 2: Commit**

```bash
git add app/api/integrations/instagram/messages/route.ts
git commit -m "feat(instagram): read DMs from Redis cache with Composio fallback, multi-account support"
```

---

### Task 7: Create Instagram Reply Endpoint

**Files:**
- Create: `app/api/integrations/instagram/reply/route.ts`

**Step 1: Create the reply route**

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getComposio, COMPOSIO_APPS } from "@/lib/composio-tools";

/** POST - Reply to an Instagram DM via Composio */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { connectedAccountId, conversationId, text } = body;

    if (!connectedAccountId || !conversationId || !text?.trim()) {
      return NextResponse.json(
        { error: "connectedAccountId, conversationId, and text are required" },
        { status: 400 }
      );
    }

    const composio = getComposio();

    // Verify the connected account belongs to this user
    const list = await composio.connectedAccounts.list({
      userIds: [session.user.id],
      statuses: ["ACTIVE"],
      toolkitSlugs: [COMPOSIO_APPS.instagram.slug],
    });
    const items = (list as { items?: Array<any> }).items ?? [];
    const account = items.find((item: any) => item.id === connectedAccountId);
    if (!account) {
      return NextResponse.json({ error: "Instagram account not found" }, { status: 404 });
    }

    // Send the message via Composio
    const result = await composio.tools.execute("INSTAGRAM_SEND_MESSAGE", {
      userId: session.user.id,
      connectedAccountId,
      arguments: {
        conversation_id: conversationId,
        message: text.trim(),
      },
      dangerouslySkipVersionCheck: true,
    });

    // Invalidate Redis cache for this account to trigger fresh data on next read
    try {
      const { getRedis } = await import("@/lib/redis");
      const redis = getRedis();
      await redis.del(`instagram:messages:${session.user.id}:${connectedAccountId}`);
    } catch {
      // Redis not configured — non-fatal
    }

    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error("[instagram/reply]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send message" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/integrations/instagram/reply/route.ts
git commit -m "feat(instagram): add reply endpoint routing to correct Composio account"
```

---

### Task 8: Update Settings UI for Multi-Account Instagram

**Files:**
- Modify: `app/(app)/settings/integrations/page.tsx`

**Step 1: Update ComposioIntegrationsSection**

The Instagram card (lines 84, 107, 131-166) currently shows a single Connect/Connected state. Replace the Instagram card rendering with a multi-account section that shows up to 3 slots.

Key changes to `ComposioIntegrationsSection`:
1. The `composio-status` query now returns `instagram: InstagramAccount[]` instead of `instagram: boolean`
2. For the Instagram card specifically, render account slots instead of the generic card
3. Add disconnect functionality for individual Instagram accounts
4. Keep all other cards (Google Calendar, ClickUp, LinkedIn) unchanged

The `isConnected` check at line 107 needs to handle the new array format:
- For Instagram: `composioStatus?.instagram?.length > 0`
- For others: unchanged boolean check

The Instagram card body (lines 131-166) should render:
- List of connected accounts with username + disconnect button
- "Connect" button for empty slots (up to 3)
- "Max 3 accounts" label when full

Add a disconnect mutation that calls `DELETE /api/integrations/composio/disconnect?connectedAccountId=xxx`.

**Step 2: Commit**

```bash
git add "app/(app)/settings/integrations/page.tsx"
git commit -m "feat(instagram): multi-account UI in settings with 3 slots and disconnect"
```

---

### Task 9: Update KinsoInbox for Multi-Account Instagram Display

**Files:**
- Modify: `components/inbox/KinsoInbox.tsx`

**Step 1: Add account username badge to Instagram contacts**

The Contact interface (line 23-48) needs two new optional fields:
```typescript
connectedAccountId?: string;
accountUsername?: string;
```

In the contact rendering section (lines 516-584), for Instagram contacts, display the account username badge next to the "Instagram" badge:

After the existing Instagram badge (lines 571-575), add:
```tsx
{contact.isInstagram && (contact as any).accountUsername && (
  <span className="text-[10px] text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">
    @{(contact as any).accountUsername}
  </span>
)}
```

The contact merging logic (lines 289-308) already handles Instagram contacts by ID, and since each account's contacts now have unique IDs (`instagram_{accountId}_{convId}`), they will naturally appear as separate entries. No change needed to merging logic.

**Step 2: Update the Instagram empty state message (line 507-509)**

Change from "Connect Instagram in Settings" to include multi-account context:
```tsx
Connect Instagram accounts (up to 3) in Settings → Integrations to see DMs here.
```

**Step 3: Commit**

```bash
git add components/inbox/KinsoInbox.tsx
git commit -m "feat(instagram): show account username badges in unified inbox"
```

---

### Task 10: Add Instagram Reply Support to EmailViewer/ContactThread

**Files:**
- Modify: `components/inbox/EmailViewer.tsx` (or the component that opens when clicking an Instagram conversation)

**Step 1: Add reply capability for Instagram messages**

When viewing an Instagram conversation thread, the reply composer needs to:
1. Detect that this is an Instagram conversation (check `contact.isInstagram`)
2. Extract `connectedAccountId` and `conversationId` from the contact/message metadata
3. Send replies via `POST /api/integrations/instagram/reply` instead of the generic messages endpoint
4. Show "Replying as @username" indicator

In `EmailViewer.tsx` (or wherever Instagram threads are displayed), add a reply form for Instagram messages:

```typescript
const handleInstagramReply = async (text: string) => {
  const connectedAccountId = contact.connectedAccountId || contact.messages?.[0]?.metadata?.connectedAccountId;
  const conversationId = contact.conversationId || contact.messages?.[0]?.metadata?.conversationId;

  if (!connectedAccountId || !conversationId) return;

  const res = await fetch('/api/integrations/instagram/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectedAccountId, conversationId, text }),
  });

  if (!res.ok) throw new Error('Failed to send reply');

  // Refetch messages
  queryClient.invalidateQueries({ queryKey: ['instagram-messages'] });
};
```

Display "Replying as @{accountUsername}" above the input when `contact.accountUsername` is available.

**Step 2: Commit**

```bash
git add components/inbox/EmailViewer.tsx
git commit -m "feat(instagram): add reply support for Instagram DMs in conversation viewer"
```

---

### Task 11: Integration Testing & Verification

**Step 1: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 2: Verify dev server starts**

Run: `npm run dev`
Expected: Server starts without errors, no runtime issues

**Step 3: Manual verification checklist**

- [ ] Settings page loads, shows Instagram section with up to 3 slots
- [ ] Can connect first Instagram account (Composio OAuth flow)
- [ ] Can connect second/third account (allowMultiple works)
- [ ] Max 3 limit enforced (4th connection rejected)
- [ ] Status route returns array of Instagram accounts
- [ ] Can disconnect individual Instagram accounts
- [ ] Inngest dashboard shows `instagram-dm-sync` function registered
- [ ] Sync worker runs on cron and populates Redis
- [ ] Inbox shows DMs from all connected accounts
- [ ] Each conversation shows @username badge
- [ ] Can reply to Instagram DMs from inbox
- [ ] Reply routes to correct account
- [ ] Redis cache fallback to direct Composio works when Redis is down

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(instagram): address integration test findings"
```
