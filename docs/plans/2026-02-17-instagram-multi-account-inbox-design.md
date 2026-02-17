# Instagram Multi-Account Unified Inbox Design

**Date:** 2026-02-17
**Status:** Approved

## Problem

Users can currently connect one Instagram Business/Creator account via Composio and see DMs in the unified inbox. They need to connect up to 3 Instagram accounts and view/reply to DMs from all of them in one merged feed.

## Constraints

- Composio is the Instagram provider (supports multi-account via `allowMultiple: true`)
- Instagram Business/Creator accounts only (Meta API limitation)
- No database persistence for messages — use Upstash Redis as a cache layer
- Max 3 Instagram accounts per user
- Single Instagram icon in inbox sidebar with merged feed (account badges on each message)

## Architecture

```
Settings UI (connect up to 3 accounts)
        ↓
Composio (OAuth + token management, allowMultiple: true)
        ↓
Inngest cron (every 3 min) → fetches DMs from all accounts
        ↓
Upstash Redis (cache layer, 10-min TTL)
        ↓
GET /api/integrations/instagram/messages → reads from Redis
        ↓
POST /api/integrations/instagram/reply → routes to correct account via connectedAccountId
        ↓
KinsoInbox.tsx → merged feed with @username badges
```

## Component Design

### 1. Multi-Account Connection Flow

**Settings > Integrations page** shows an Instagram section with up to 3 slots:

- Each slot shows: account username, connected status, disconnect button
- Empty slots show a "Connect" button
- Backend enforces max 3 accounts before initiating new OAuth flow

**API changes:**

- `GET /api/integrations/composio/connect?app=instagram` — add `allowMultiple: true` when user already has an existing Instagram connection
- `GET /api/integrations/composio/status` — return array of connected accounts per app (with `connectedAccountId` and username), not just boolean
- `DELETE /api/integrations/composio/disconnect?connectedAccountId=ca_xxx` — new endpoint to disconnect a specific account

### 2. Background Sync Worker (Inngest)

**Function:** `instagram-dm-sync`
**Trigger:** Cron every 3 minutes + on-demand event `instagram/sync.requested`

**Steps:**

1. Fetch all users with ACTIVE Instagram Composio connections
2. For each user, for each connected account (parallelized):
   a. Call `INSTAGRAM_LIST_ALL_CONVERSATIONS` via Composio
   b. For each conversation, call `INSTAGRAM_LIST_ALL_MESSAGES`
   c. Normalize messages to unified format with account metadata
   d. Write to Upstash Redis
3. On error per account: log warning, skip, continue others

**Redis key structure:**

```
instagram:messages:{userId}:{connectedAccountId}  →  [conversations...]
instagram:accounts:{userId}                         →  [{connectedAccountId, username, status}...]
instagram:sync:last:{userId}                        →  ISO timestamp
```

All keys have 10-minute TTL (auto-expire if sync stops running).

### 3. Messages API

**`GET /api/integrations/instagram/messages`** (modified):

1. Auth check → get userId
2. Read all Redis keys matching `instagram:messages:{userId}:*`
3. Merge all accounts' conversations into one list
4. Each conversation includes `connectedAccountId` and `accountUsername` metadata
5. Sort by latest message timestamp descending
6. Return unified format (same shape as current, with added account metadata)

### 4. Reply Endpoint

**`POST /api/integrations/instagram/reply`** (new):

1. Auth check → get userId
2. Body: `{ connectedAccountId, conversationId, text }`
3. Validate `connectedAccountId` belongs to this user (via Composio)
4. Call `composio.tools.execute("INSTAGRAM_SEND_MESSAGE", { connectedAccountId, arguments: { conversation_id, message: text } })`
5. Invalidate Redis cache for this account
6. Return success/error

### 5. Settings UI Changes

Extend the existing Instagram card in Settings > Integrations:

- Show up to 3 account slots
- Connected accounts show username + disconnect button
- Empty slots show "Connect" button
- "Max 3 accounts" label when all slots filled

### 6. Inbox UI Changes

**KinsoInbox.tsx:**

- Single Instagram icon in left sidebar filter (unchanged)
- Badge shows total unread count across all accounts
- Each conversation in the list shows `@username` badge indicating which account received it
- Instagram label badge (pink) remains

**ContactThread.tsx:**

- Reply composer knows the `connectedAccountId` from the conversation metadata
- Shows "Replying as @username" indicator above the input
- Posts to `/api/integrations/instagram/reply`

## Data Flow

```
Composio (source of truth for connections + messages)
    ↓ (synced every 3 min by Inngest worker)
Upstash Redis (read cache, 10-min TTL)
    ↓ (read by inbox API on 10s poll)
Unified Inbox UI
    ↓ (reply action)
Composio INSTAGRAM_SEND_MESSAGE → Instagram
```

## Error Handling

- **Composio connection expires:** Sync worker marks account as errored in Redis. UI shows "Reconnect" prompt.
- **Composio rate limits:** Sync worker backs off per account, continues others.
- **Redis unavailable:** Messages API falls back to direct Composio fetch (current behavior).
- **Reply fails:** Return error to UI, show toast notification. Do not cache failed replies.
- **Account disconnected mid-sync:** Skip account, remove from Redis cache.

## Dependencies

- `@upstash/redis` — new package for Redis client
- Upstash Redis instance — needs to be provisioned
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars
- Existing: `@composio/core`, `@composio/vercel`, Inngest
