# Microsoft Teams Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Microsoft Teams into Unified Box via Composio — full AI Chat tool access (34 tools), live-fetched inbox messages (no DB storage), reply from inbox, and settings page.

**Architecture:** Follows the established Composio pattern (same as Instagram/LinkedIn/ClickUp). Teams tools are registered in the Composio session, exposed to AYA AI in chat, and a new API endpoint live-fetches Teams messages for the inbox via Composio's `tools.execute()`.

**Tech Stack:** Next.js, Prisma, Composio SDK, React Query, Vercel AI SDK

---

### Task 1: Add Teams to Composio Backend

**Files:**
- Modify: `lib/composio-tools.ts:10-17` (env vars), `45-66` (COMPOSIO_APPS), `92-100` (getAppDisplayName), `106-130` (getComposioSessionTools)

**Step 1: Add Teams env var references at top of file**

After line 17, add:

```typescript
const toolkitSlugTeams = process.env.COMPOSIO_TOOLKIT_SLUG_TEAMS || "microsoft_teams";
const authConfigIdTeams = process.env.COMPOSIO_AUTH_CONFIG_ID_TEAMS || "";
```

**Step 2: Add Teams to COMPOSIO_APPS map**

After the `linkedin` entry (line 65), add:

```typescript
  microsoft_teams: {
    slug: process.env.COMPOSIO_TOOLKIT_SLUG_TEAMS || "microsoft_teams",
    authConfigId: process.env.COMPOSIO_AUTH_CONFIG_ID_TEAMS || "",
    name: "Microsoft Teams",
  },
```

**Step 3: Add Teams to getAppDisplayName()**

After the LinkedIn check (line 98), add:

```typescript
  if (slug === "microsoft_teams") return "Microsoft Teams";
```

**Step 4: Add Teams to getComposioSessionTools()**

After `if (authConfigIdLinkedin) toolkits.push(toolkitSlugLinkedin);` (line 111), add:

```typescript
  if (authConfigIdTeams) toolkits.push(toolkitSlugTeams);
```

After `if (authConfigIdLinkedin) authConfigs[toolkitSlugLinkedin] = authConfigIdLinkedin;` (line 124), add:

```typescript
  if (authConfigIdTeams) authConfigs[toolkitSlugTeams] = authConfigIdTeams;
```

**Step 5: Update module doc comment**

Change line 2 from:
```
 * Composio integration for AI chat: Google Calendar, ClickUp, Instagram.
```
To:
```
 * Composio integration for AI chat: Google Calendar, ClickUp, Instagram, LinkedIn, Microsoft Teams.
```

**Step 6: Commit**

```bash
git add lib/composio-tools.ts
git commit -m "feat(teams): add Microsoft Teams to Composio backend integration"
```

---

### Task 2: Add Teams Tool Display Names

**Files:**
- Modify: `lib/tool-display-names.ts:13-54` (TOOL_DISPLAY_NAMES map), `82-97` (itemLabelForTool)

**Step 1: Add all 34 Teams tool display names**

After the LinkedIn section (line 53), add:

```typescript
  // Microsoft Teams
  MICROSOFT_TEAMS_ADD_MEMBER_TO_TEAM: "Add Team Member",
  MICROSOFT_TEAMS_ARCHIVE_TEAM: "Archive Team",
  MICROSOFT_TEAMS_CHATS_GET_ALL_CHATS: "List Teams Chats",
  MICROSOFT_TEAMS_CHATS_GET_ALL_MESSAGES: "Get Chat Messages",
  MICROSOFT_TEAMS_CREATE_MEETING: "Create Teams Meeting",
  MICROSOFT_TEAMS_CREATE_TEAM: "Create Team",
  MICROSOFT_TEAMS_DELETE_TEAM: "Delete Team",
  MICROSOFT_TEAMS_GET_CHANNEL: "Get Channel Details",
  MICROSOFT_TEAMS_GET_CHAT_MESSAGE: "Get Chat Message",
  MICROSOFT_TEAMS_GET_MY_PROFILE: "Get My Profile",
  MICROSOFT_TEAMS_GET_TEAM: "Get Team Details",
  MICROSOFT_TEAMS_GET_TEAM_OPERATION: "Get Operation Status",
  MICROSOFT_TEAMS_LIST_MESSAGE_REPLIES: "List Message Replies",
  MICROSOFT_TEAMS_LIST_TEAM_MEMBERS: "List Team Members",
  MICROSOFT_TEAMS_LIST_TEAMS_TEMPLATES: "List Team Templates",
  MICROSOFT_TEAMS_LIST_USER_JOINED_TEAMS: "List Joined Teams",
  MICROSOFT_TEAMS_LIST_USERS: "List Organization Users",
  MICROSOFT_TEAMS_SEARCH_FILES: "Search Teams Files",
  MICROSOFT_TEAMS_SEARCH_MESSAGES: "Search Teams Messages",
  MICROSOFT_TEAMS_TEAMS_CREATE_CHANNEL: "Create Channel",
  MICROSOFT_TEAMS_TEAMS_CREATE_CHAT: "Create Chat",
  MICROSOFT_TEAMS_TEAMS_GET_MESSAGE: "Get Channel Message",
  MICROSOFT_TEAMS_TEAMS_LIST: "List Teams",
  MICROSOFT_TEAMS_TEAMS_LIST_CHANNEL_MESSAGES: "List Channel Messages",
  MICROSOFT_TEAMS_TEAMS_LIST_CHANNELS: "List Channels",
  MICROSOFT_TEAMS_TEAMS_LIST_CHAT_MESSAGES: "List Chat Messages",
  MICROSOFT_TEAMS_TEAMS_LIST_PEOPLE: "List People",
  MICROSOFT_TEAMS_TEAMS_POST_CHANNEL_MESSAGE: "Post Channel Message",
  MICROSOFT_TEAMS_TEAMS_POST_CHAT_MESSAGE: "Send Chat Message",
  MICROSOFT_TEAMS_TEAMS_POST_MESSAGE_REPLY: "Reply to Message",
  MICROSOFT_TEAMS_UNARCHIVE_TEAM: "Unarchive Team",
  MICROSOFT_TEAMS_UPDATE_CHANNEL_MESSAGE: "Update Channel Message",
  MICROSOFT_TEAMS_UPDATE_CHAT_MESSAGE: "Update Chat Message",
  MICROSOFT_TEAMS_UPDATE_TEAM: "Update Team Settings",
```

**Step 2: Add Teams-specific label keywords to itemLabelForTool**

After `if (lower.includes("media")) return "media items";` (line 95), add:

```typescript
  if (lower.includes("channel")) return "channels";
  if (lower.includes("team")) return "teams";
  if (lower.includes("member")) return "members";
  if (lower.includes("people")) return "people";
  if (lower.includes("user")) return "users";
  if (lower.includes("file")) return "files";
  if (lower.includes("chat")) return "chats";
  if (lower.includes("meeting")) return "meetings";
  if (lower.includes("template")) return "templates";
  if (lower.includes("repl")) return "replies";
```

**Step 3: Commit**

```bash
git add lib/tool-display-names.ts
git commit -m "feat(teams): add display names for all 34 Microsoft Teams Composio tools"
```

---

### Task 3: Add Teams to AI Chat System Prompt & Connection Status

**Files:**
- Modify: `app/api/ai-chat/stream/route.ts:27-74` (AVAILABLE_INTEGRATIONS), `115-120` (connectedAccounts toolkitSlugs)

**Step 1: Add microsoftTeams to AVAILABLE_INTEGRATIONS**

After the `slack` entry (line 73), add:

```typescript
  microsoftTeams: {
    name: 'Microsoft Teams',
    description: 'Team collaboration, chat, channels, and meetings',
    features: [
      'Send and read messages in chats and channels',
      'List teams, channels, and members',
      'Create, schedule, and manage meetings',
      'Search messages and files across Teams',
      'Create teams, channels, and chats',
      'Reply to channel messages',
    ],
    settingsPath: '/settings/integrations',
    composioApp: 'microsoft_teams',
  },
```

**Step 2: Add microsoft_teams to connectedAccounts.list() toolkitSlugs**

At line 119, add `COMPOSIO_APPS.microsoft_teams.slug` to the toolkitSlugs array:

```typescript
        toolkitSlugs: [
          COMPOSIO_APPS.googlecalendar.slug,
          COMPOSIO_APPS.clickup.slug,
          COMPOSIO_APPS.instagram.slug,
          COMPOSIO_APPS.linkedin.slug,
          COMPOSIO_APPS.microsoft_teams.slug,
        ],
```

**Step 3: Commit**

```bash
git add app/api/ai-chat/stream/route.ts
git commit -m "feat(teams): add Microsoft Teams to AI chat system prompt and connection detection"
```

---

### Task 4: Add Teams to Composio Status API

**Files:**
- Modify: `app/api/integrations/composio/status/route.ts:21-33` (toolkitSlugs, response)

**Step 1: Add microsoft_teams to toolkitSlugs and response**

Add `COMPOSIO_APPS.microsoft_teams.slug` to the toolkitSlugs array at line 32:

```typescript
      toolkitSlugs: [
        COMPOSIO_APPS.googlecalendar.slug,
        COMPOSIO_APPS.clickup.slug,
        COMPOSIO_APPS.instagram.slug,
        COMPOSIO_APPS.linkedin.slug,
        COMPOSIO_APPS.microsoft_teams.slug,
      ],
```

Update the default response (line 22) and final response (lines 55-60) to include `microsoftTeams`:

Default:
```typescript
return NextResponse.json({ googleCalendar: false, clickUp: false, instagram: [], linkedin: false, microsoftTeams: false });
```

Final response:
```typescript
    return NextResponse.json({
      googleCalendar: otherSlugs.has(COMPOSIO_APPS.googlecalendar.slug.toLowerCase()),
      clickUp: otherSlugs.has(COMPOSIO_APPS.clickup.slug.toLowerCase()),
      instagram: instagramAccounts,
      linkedin: otherSlugs.has(COMPOSIO_APPS.linkedin.slug.toLowerCase()),
      microsoftTeams: otherSlugs.has(COMPOSIO_APPS.microsoft_teams.slug.toLowerCase()),
    });
```

Error fallback (line 63):
```typescript
return NextResponse.json({ googleCalendar: false, clickUp: false, instagram: [], linkedin: false, microsoftTeams: false });
```

**Step 2: Commit**

```bash
git add app/api/integrations/composio/status/route.ts
git commit -m "feat(teams): add Microsoft Teams to Composio connection status API"
```

---

### Task 5: Add TEAMS to Prisma Schema + Migrate

**Files:**
- Modify: `prisma/schema.prisma:19-27` (MessageChannel enum)

**Step 1: Add TEAMS to MessageChannel enum**

```prisma
enum MessageChannel {
  SMS
  WHATSAPP
  EMAIL
  TWITTER
  FACEBOOK
  SLACK
  INSTAGRAM
  TEAMS
}
```

**Step 2: Generate Prisma client and create migration**

```bash
npx prisma generate
npx prisma migrate dev --name add_teams_channel
```

**Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ app/generated/
git commit -m "feat(teams): add TEAMS to MessageChannel enum"
```

---

### Task 6: Create Teams Messages API (Live Fetch)

**Files:**
- Create: `app/api/integrations/teams/messages/route.ts`

**Step 1: Create the Teams messages API route**

This follows the Instagram messages API pattern — authenticate user, check Composio connection, execute tools, normalize response. No DB storage.

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getComposio, COMPOSIO_APPS } from "@/lib/composio-tools";

/** GET - Live-fetch Teams messages via Composio (no DB storage) */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ contacts: [], total: 0, connected: false });
    }

    const composio = getComposio();

    // Check if user has an active Teams connection
    const list = await composio.connectedAccounts.list({
      userIds: [session.user.id],
      statuses: ["ACTIVE"],
      toolkitSlugs: [COMPOSIO_APPS.microsoft_teams.slug],
    });
    const items = (list as { items?: Array<any> }).items ?? [];
    if (items.length === 0) {
      return NextResponse.json({ contacts: [], total: 0, connected: false });
    }

    const connectedAccountId = items[0].id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "chats";
    const chatId = searchParams.get("chatId");
    const teamId = searchParams.get("teamId");
    const channelId = searchParams.get("channelId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (type === "chats") {
      // Fetch all chats the user is part of
      const response = await composio.tools.execute("MICROSOFT_TEAMS_CHATS_GET_ALL_CHATS", {
        userId: session.user.id,
        connectedAccountId,
        arguments: { user_id: "me", limit },
      });

      const raw = (response as any).data ?? response;
      const chats = raw?.data?.value ?? raw?.value ?? (Array.isArray(raw) ? raw : []);

      const contacts = chats.map((chat: any) => {
        const chatTopic = chat.topic || chat.chatType || "Chat";
        const members = chat.members ?? [];
        const displayName = chatTopic !== "Chat" && chatTopic !== "oneOnOne"
          ? chatTopic
          : members.map((m: any) => m.displayName).filter(Boolean).join(", ") || `Teams Chat`;
        const lastMessage = chat.lastMessagePreview;

        return {
          id: `teams_chat_${chat.id}`,
          name: displayName,
          chatId: chat.id,
          chatType: chat.chatType,
          messages: lastMessage ? [{
            id: `teams_msg_${chat.id}_last`,
            content: lastMessage.body?.content?.replace(/<[^>]*>/g, "") || lastMessage.body?.content || "(no content)",
            channel: "TEAMS" as const,
            direction: "INBOUND" as const,
            status: "DELIVERED",
            createdAt: lastMessage.createdDateTime || chat.lastUpdatedDateTime || new Date().toISOString(),
            readAt: null,
            metadata: { chatId: chat.id, connectedAccountId },
          }] : [],
          _count: { messages: lastMessage ? 1 : 0 },
          isTeams: true,
          connectedAccountId,
        };
      });

      return NextResponse.json({
        contacts,
        total: contacts.length,
        connected: true,
      });
    }

    if (type === "chat_messages" && chatId) {
      // Fetch messages from a specific chat
      const response = await composio.tools.execute("MICROSOFT_TEAMS_CHATS_GET_ALL_MESSAGES", {
        userId: session.user.id,
        connectedAccountId,
        arguments: { chat_id: chatId, limit },
      });

      const raw = (response as any).data ?? response;
      const messages = raw?.data?.value ?? raw?.value ?? (Array.isArray(raw) ? raw : []);

      const normalizedMessages = messages.map((msg: any) => {
        const sender = msg.from?.user || msg.from || {};
        const content = msg.body?.content?.replace(/<[^>]*>/g, "") || msg.body?.content || "";

        return {
          id: msg.id,
          content: content || "(no content)",
          channel: "TEAMS" as const,
          direction: "INBOUND" as const,
          status: "DELIVERED",
          sender: {
            displayName: sender.displayName || "Unknown",
            email: sender.userIdentityType === "aadUser" ? sender.id : undefined,
          },
          createdAt: msg.createdDateTime || new Date().toISOString(),
          readAt: null,
          metadata: { chatId, messageId: msg.id, connectedAccountId },
        };
      });

      return NextResponse.json({
        messages: normalizedMessages,
        total: normalizedMessages.length,
        connected: true,
      });
    }

    if (type === "teams") {
      // List all teams the user has joined
      const response = await composio.tools.execute("MICROSOFT_TEAMS_LIST_USER_JOINED_TEAMS", {
        userId: session.user.id,
        connectedAccountId,
        arguments: { user_id: "me" },
      });

      const raw = (response as any).data ?? response;
      const teams = raw?.data?.value ?? raw?.value ?? (Array.isArray(raw) ? raw : []);

      return NextResponse.json({
        teams: teams.map((team: any) => ({
          id: team.id,
          displayName: team.displayName,
          description: team.description,
        })),
        total: teams.length,
        connected: true,
      });
    }

    if (type === "channels" && teamId) {
      // List channels for a specific team
      const response = await composio.tools.execute("MICROSOFT_TEAMS_TEAMS_LIST_CHANNELS", {
        userId: session.user.id,
        connectedAccountId,
        arguments: { team_id: teamId },
      });

      const raw = (response as any).data ?? response;
      const channels = raw?.data?.value ?? raw?.value ?? (Array.isArray(raw) ? raw : []);

      return NextResponse.json({
        channels: channels.map((ch: any) => ({
          id: ch.id,
          displayName: ch.displayName,
          description: ch.description,
          membershipType: ch.membershipType,
          teamId,
        })),
        total: channels.length,
        connected: true,
      });
    }

    if (type === "channel_messages" && teamId && channelId) {
      // List messages in a channel
      const response = await composio.tools.execute("MICROSOFT_TEAMS_TEAMS_LIST_CHANNEL_MESSAGES", {
        userId: session.user.id,
        connectedAccountId,
        arguments: { team_id: teamId, channel_id: channelId, top: Math.min(limit, 50) },
      });

      const raw = (response as any).data ?? response;
      const messages = raw?.data?.value ?? raw?.value ?? (Array.isArray(raw) ? raw : []);

      const normalizedMessages = messages.map((msg: any) => {
        const sender = msg.from?.user || msg.from || {};
        const content = msg.body?.content?.replace(/<[^>]*>/g, "") || msg.body?.content || "";

        return {
          id: msg.id,
          content: content || "(no content)",
          channel: "TEAMS" as const,
          direction: "INBOUND" as const,
          status: "DELIVERED",
          sender: {
            displayName: sender.displayName || "Unknown",
          },
          createdAt: msg.createdDateTime || new Date().toISOString(),
          readAt: null,
          metadata: { teamId, channelId, messageId: msg.id, connectedAccountId },
        };
      });

      return NextResponse.json({
        messages: normalizedMessages,
        total: normalizedMessages.length,
        connected: true,
      });
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (e) {
    console.warn("[teams/messages]", e);
    return NextResponse.json({ contacts: [], total: 0, connected: false });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/integrations/teams/messages/route.ts
git commit -m "feat(teams): add live-fetch Teams messages API endpoint via Composio"
```

---

### Task 7: Create Teams Reply API

**Files:**
- Create: `app/api/integrations/teams/reply/route.ts`

**Step 1: Create the Teams reply API route**

Follows the Instagram reply pattern:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getComposio, COMPOSIO_APPS } from "@/lib/composio-tools";

/** POST - Send a reply to a Teams chat or channel via Composio */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, chatId, teamId, channelId, messageId, content, contentType } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const composio = getComposio();

    // Verify the connected account belongs to this user
    const list = await composio.connectedAccounts.list({
      userIds: [session.user.id],
      statuses: ["ACTIVE"],
      toolkitSlugs: [COMPOSIO_APPS.microsoft_teams.slug],
    });
    const items = (list as { items?: Array<any> }).items ?? [];
    if (items.length === 0) {
      return NextResponse.json({ error: "Microsoft Teams not connected" }, { status: 404 });
    }

    const connectedAccountId = items[0].id;
    let result: any;

    if (type === "chat") {
      if (!chatId) {
        return NextResponse.json({ error: "chatId is required for chat replies" }, { status: 400 });
      }

      result = await composio.tools.execute("MICROSOFT_TEAMS_TEAMS_POST_CHAT_MESSAGE", {
        userId: session.user.id,
        connectedAccountId,
        arguments: {
          chat_id: chatId,
          content: content.trim(),
          content_type: contentType || "text",
        },
      });
    } else if (type === "channel") {
      if (!teamId || !channelId) {
        return NextResponse.json({ error: "teamId and channelId are required for channel messages" }, { status: 400 });
      }

      if (messageId) {
        // Reply to a specific channel message
        result = await composio.tools.execute("MICROSOFT_TEAMS_TEAMS_POST_MESSAGE_REPLY", {
          userId: session.user.id,
          connectedAccountId,
          arguments: {
            team_id: teamId,
            channel_id: channelId,
            message_id: messageId,
            content: content.trim(),
            content_type: contentType || "text",
          },
        });
      } else {
        // Post a new channel message
        result = await composio.tools.execute("MICROSOFT_TEAMS_TEAMS_POST_CHANNEL_MESSAGE", {
          userId: session.user.id,
          connectedAccountId,
          arguments: {
            team_id: teamId,
            channel_id: channelId,
            content: content.trim(),
            content_type: contentType || "text",
          },
        });
      }
    } else {
      return NextResponse.json({ error: "type must be 'chat' or 'channel'" }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error("[teams/reply]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send message" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/integrations/teams/reply/route.ts
git commit -m "feat(teams): add Teams reply API for chat and channel messages"
```

---

### Task 8: Wire Teams into Unified Inbox (KinsoInbox)

**Files:**
- Modify: `components/inbox/KinsoInbox.tsx:22-30` (Contact interface), `50-60` (state/hooks), `100-137` (Instagram query — add Teams), `160-182` (handleSync), `184-205` (getIntegrationStatus), `270-310` (add Teams contacts), `316-323` (integrationChannelMap), `355-367` (getChannelIcon), `369-381` (getChannelColor), `470-516` (loading/empty states)

**Step 1: Add `isTeams` flag to Contact interface**

At line 30 (after `isInstagram`), add:

```typescript
  isTeams?: boolean;
```

**Step 2: Add Teams data fetch query**

After the Instagram query (line 137), add:

```typescript
  // Fetch Teams messages (live via Composio)
  const { data: teamsData, isLoading: teamsLoading, refetch: refetchTeams, error: teamsError } = useQuery({
    queryKey: ['teams-messages', selectedIntegration],
    queryFn: async () => {
      const res = await fetch('/api/integrations/teams/messages?type=chats&limit=50');
      if (!res.ok) {
        console.warn('Failed to fetch Teams messages:', res.statusText);
        return { contacts: [], connected: false };
      }
      const data = await res.json();
      return { ...data, connected: data.connected ?? true };
    },
    refetchInterval: 30000, // 30s interval (live fetch is heavier)
    retry: 1,
    enabled: true,
  });
```

**Step 3: Update handleSync to include Teams**

Add `refetchTeams` to the Promise.all in handleSync and to the useCallback deps:

```typescript
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    toast.info("Syncing messages...", { id: "sync-toast" });

    try {
      await Promise.all([
        refetchContacts(),
        refetchGmail(),
        refetchSlack(),
        refetchInstagram(),
        refetchTeams(),
      ]);
      toast.success("Messages synced successfully", { id: "sync-toast" });
    } catch (error) {
      toast.error("Failed to sync some channels", { id: "sync-toast" });
    } finally {
      setIsSyncing(false);
    }
  }, [refetchContacts, refetchGmail, refetchSlack, refetchInstagram, refetchTeams]);
```

**Step 4: Add Teams to getIntegrationStatus**

Add a `'Teams'` case before `default`:

```typescript
      case 'Teams':
        if (teamsLoading) return 'loading';
        if (teamsError) return 'error';
        if (teamsData?.connected && teamsData?.contacts?.length > 0) return 'connected';
        return 'disconnected';
```

**Step 5: Add Teams contacts to the merge logic**

After the Instagram contacts merge (around line 310), add:

```typescript
  const teamsContacts: Contact[] = teamsData?.contacts || [];

  // Add Teams contacts
  teamsContacts.forEach(teamsContact => {
    const key = teamsContact.id;
    const existing = contactsMap.get(key);

    if (existing) {
      existing.messages = [
        ...existing.messages,
        ...teamsContact.messages,
      ].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      existing._count.messages = existing.messages.length;
    } else {
      contactsMap.set(key, {
        ...teamsContact,
        isTeams: true,
      });
    }
  });
```

**Step 6: Fix integrationChannelMap for Teams**

Change:
```typescript
      'Teams': ['SLACK'], // Teams messages might use SLACK channel or similar
```
To:
```typescript
      'Teams': ['TEAMS'],
```

**Step 7: Add Teams source flag check to filter**

After the Instagram check (line 331), add:

```typescript
      if (selectedIntegration === 'Teams' && c.isTeams) return true;
```

**Step 8: Add TEAMS to getChannelIcon and getChannelColor**

In `getChannelIcon` (after INSTAGRAM line):
```typescript
      TEAMS: "👥",
```

In `getChannelColor` (after INSTAGRAM line):
```typescript
      TEAMS: "text-indigo-600",
```

**Step 9: Add Teams badge to message display**

After the Instagram badge section (around line 582), add:

```typescript
                                {contact.isTeams && (
                                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                    Teams
                                  </span>
                                )}
```

**Step 10: Update loading state to include teamsLoading**

At the loading check (line 474), add `teamsLoading`:
```typescript
              {(contactsLoading || gmailLoading || slackLoading || instagramLoading || teamsLoading) ? (
```

**Step 11: Add Teams empty state hint**

After the Instagram empty state hint (line 511), add:

```typescript
                  {selectedIntegration === 'Teams' && teamsContacts.length === 0 && (
                    <p className="text-xs mt-2">
                      Connect Microsoft Teams in Settings → Integrations to see your chats here.
                    </p>
                  )}
```

**Step 12: Commit**

```bash
git add components/inbox/KinsoInbox.tsx
git commit -m "feat(teams): wire Microsoft Teams into unified inbox with live fetch"
```

---

### Task 9: Add Teams to Messages Page

**Files:**
- Modify: `app/(app)/messages/page.tsx:9-29` (imports), `31-39` (CHANNELS array)

**Step 1: Add MessageSquare import for Teams icon**

The `MessageSquare` import already exists at line 18. Use it for Teams.

**Step 2: Add Teams to CHANNELS array**

After the FACEBOOK entry (line 38), add:

```typescript
  { id: "TEAMS", label: "Teams", icon: MessageSquare },
```

**Step 3: Commit**

```bash
git add "app/(app)/messages/page.tsx"
git commit -m "feat(teams): add Teams channel filter to messages page"
```

---

### Task 10: Add Teams to Integrations Settings Page

**Files:**
- Modify: `app/(app)/settings/integrations/page.tsx:36-37` (default status), `57` (mutation type), `100-105` (apps array), `126` (isConnected check)

**Step 1: Update default composio status to include microsoftTeams**

At line 36, add `microsoftTeams: false` to the default return:

```typescript
      if (!res.ok) return { googleCalendar: false, clickUp: false, instagram: [], linkedin: false, microsoftTeams: false };
```

**Step 2: Update connectComposioMutation type union**

At line 57, add `"microsoft_teams"`:

```typescript
    mutationFn: async (app: "googlecalendar" | "clickup" | "instagram" | "linkedin" | "microsoft_teams") => {
```

**Step 3: Add Microsoft Teams to the apps array**

After the LinkedIn entry (line 104), add. Need to import a suitable icon — use `MessageSquare` from lucide-react (add to imports at line 6):

```typescript
    { id: "microsoft_teams", name: "Microsoft Teams", description: "Manage chats, channels, meetings & files via AI", icon: MessageSquare },
```

**Step 4: Add isConnected check for microsoftTeams**

At line 126 (the isConnected ternary chain), add before the final `:`:

```typescript
: app.id === "microsoft_teams" ? composioStatus?.microsoftTeams
```

Full line becomes:
```typescript
          const isConnected = app.id === "googlecalendar" ? composioStatus?.googleCalendar : app.id === "clickup" ? composioStatus?.clickUp : app.id === "instagram" ? (composioStatus?.instagram?.length > 0) : app.id === "microsoft_teams" ? composioStatus?.microsoftTeams : composioStatus?.linkedin;
```

**Step 5: Commit**

```bash
git add "app/(app)/settings/integrations/page.tsx"
git commit -m "feat(teams): add Microsoft Teams to integrations settings page"
```

---

### Task 11: Add Teams to Platforms Config

**Files:**
- Modify: `lib/config/platforms.ts:1-11` (imports), `13-79` (platforms array)

**Step 1: Add Teams platform entry**

After the Slack entry (line 37), add:

```typescript
    {
      id: 'microsoft_teams',
      name: 'Microsoft Teams',
      icon: MessageSquare,
      description: 'Connect Microsoft Teams for chats, channels, and meetings',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
```

**Step 2: Commit**

```bash
git add lib/config/platforms.ts
git commit -m "feat(teams): add Microsoft Teams to platforms config"
```

---

### Task 12: Verify Build and Final Commit

**Step 1: Run type checking**

```bash
npx tsc --noEmit
```

Expected: No errors related to Teams changes.

**Step 2: Run the dev build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Verify env vars are set**

Check that `.env` contains:
```
COMPOSIO_AUTH_CONFIG_NAME_TEAMS=microsoft teams-522jsp
COMPOSIO_AUTH_CONFIG_ID_TEAMS=ac_h86ymwM3Hebb
COMPOSIO_TOOLKIT_SLUG_TEAMS=microsoft_teams
```

**Step 4: Manual smoke test (if dev server is running)**

1. Go to Settings → Integrations → verify Teams card appears
2. Go to AI Chat → ask "list my Teams" → verify tool execution
3. Go to Inbox → click Teams icon → verify chats load or "connect" message shows

---

## Summary of Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `lib/composio-tools.ts` | Modify | Add Teams to Composio session + COMPOSIO_APPS |
| `lib/tool-display-names.ts` | Modify | Add 34 Teams tool display names |
| `app/api/ai-chat/stream/route.ts` | Modify | Add Teams to system prompt + connection check |
| `app/api/integrations/composio/status/route.ts` | Modify | Report Teams connection status |
| `prisma/schema.prisma` | Modify | Add TEAMS to MessageChannel enum |
| `app/api/integrations/teams/messages/route.ts` | Create | Live-fetch Teams messages API |
| `app/api/integrations/teams/reply/route.ts` | Create | Reply to Teams chats/channels API |
| `components/inbox/KinsoInbox.tsx` | Modify | Wire Teams into inbox UI |
| `app/(app)/messages/page.tsx` | Modify | Add Teams channel filter |
| `app/(app)/settings/integrations/page.tsx` | Modify | Add Teams to settings |
| `lib/config/platforms.ts` | Modify | Add Teams platform entry |
