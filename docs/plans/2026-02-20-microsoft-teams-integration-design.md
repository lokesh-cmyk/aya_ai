# Microsoft Teams Integration Design

**Date:** 2026-02-20
**Scope:** AI Chat (full Composio tools) + Unified Inbox (live fetch, no DB storage) + Reply from Inbox
**Pattern:** Same as Instagram/LinkedIn/ClickUp Composio integrations

## Overview

Add Microsoft Teams as a fully integrated platform in Unified Box. Users can:
- **AI Chat (AYA):** Use all 34 Composio Teams tools — send/read messages, manage teams/channels, create/reschedule/delete meetings, search messages/files, manage members
- **Unified Inbox:** View Teams chats and channel messages alongside other channels (live-fetched via Composio, no DB storage for privacy)
- **Reply from Inbox:** Send replies directly from the inbox UI using Composio tools
- **Settings:** Connect/disconnect Teams via OAuth from the integrations page

## Environment Variables (Already Configured)

```env
COMPOSIO_AUTH_CONFIG_NAME_TEAMS=microsoft teams-522jsp
COMPOSIO_AUTH_CONFIG_ID_TEAMS=ac_h86ymwM3Hebb
COMPOSIO_TOOLKIT_SLUG_TEAMS=microsoft_teams
```

## Architecture

### 1. Composio Integration (Backend)

**File: `lib/composio-tools.ts`**

Add `microsoft_teams` alongside existing integrations:
- Env var references: `COMPOSIO_TOOLKIT_SLUG_TEAMS`, `COMPOSIO_AUTH_CONFIG_ID_TEAMS`
- Add to `COMPOSIO_APPS` map: `{ slug: "microsoft_teams", authConfigId: "...", name: "Microsoft Teams" }`
- Include in `getComposioSessionTools()` toolkit array
- Add to `getAppDisplayName()`: `"microsoft_teams"` → `"Microsoft Teams"`

### 2. AI Chat System Prompt

**File: `app/api/ai-chat/stream/route.ts`**

Add `microsoftTeams` to `AVAILABLE_INTEGRATIONS`:
```typescript
microsoftTeams: {
  name: 'Microsoft Teams',
  description: 'Team collaboration, chat, channels, and meetings',
  features: [
    'Send and read messages',
    'List teams and channels',
    'Create, reschedule, and delete meetings',
    'Search messages and files',
    'Manage team members',
    'Create channels and chats',
  ],
  settingsPath: '/settings/integrations',
  composioApp: 'microsoft_teams',
}
```

Add `microsoft_teams` to `connectedAccounts.list()` toolkitSlugs array.

### 3. Tool Display Names

**File: `lib/tool-display-names.ts`**

Add mappings for all 34 Teams tool slugs:

| Slug | Display Name |
|------|-------------|
| MICROSOFT_TEAMS_ADD_MEMBER_TO_TEAM | Add Team Member |
| MICROSOFT_TEAMS_ARCHIVE_TEAM | Archive Team |
| MICROSOFT_TEAMS_CHATS_GET_ALL_CHATS | List Teams Chats |
| MICROSOFT_TEAMS_CHATS_GET_ALL_MESSAGES | Get Chat Messages |
| MICROSOFT_TEAMS_CREATE_MEETING | Create Teams Meeting |
| MICROSOFT_TEAMS_CREATE_TEAM | Create Team |
| MICROSOFT_TEAMS_DELETE_TEAM | Delete Team |
| MICROSOFT_TEAMS_GET_CHANNEL | Get Channel Details |
| MICROSOFT_TEAMS_GET_CHAT_MESSAGE | Get Chat Message |
| MICROSOFT_TEAMS_GET_MY_PROFILE | Get My Profile |
| MICROSOFT_TEAMS_GET_TEAM | Get Team Details |
| MICROSOFT_TEAMS_GET_TEAM_OPERATION | Get Operation Status |
| MICROSOFT_TEAMS_LIST_MESSAGE_REPLIES | List Message Replies |
| MICROSOFT_TEAMS_LIST_TEAM_MEMBERS | List Team Members |
| MICROSOFT_TEAMS_LIST_TEAMS_TEMPLATES | List Team Templates |
| MICROSOFT_TEAMS_LIST_USER_JOINED_TEAMS | List Joined Teams |
| MICROSOFT_TEAMS_LIST_USERS | List Users |
| MICROSOFT_TEAMS_SEARCH_FILES | Search Teams Files |
| MICROSOFT_TEAMS_SEARCH_MESSAGES | Search Teams Messages |
| MICROSOFT_TEAMS_TEAMS_CREATE_CHANNEL | Create Channel |
| MICROSOFT_TEAMS_TEAMS_CREATE_CHAT | Create Chat |
| MICROSOFT_TEAMS_TEAMS_GET_MESSAGE | Get Channel Message |
| MICROSOFT_TEAMS_TEAMS_LIST | List Teams |
| MICROSOFT_TEAMS_TEAMS_LIST_CHANNEL_MESSAGES | List Channel Messages |
| MICROSOFT_TEAMS_TEAMS_LIST_CHANNELS | List Channels |
| MICROSOFT_TEAMS_TEAMS_LIST_CHAT_MESSAGES | List Chat Messages |
| MICROSOFT_TEAMS_TEAMS_LIST_PEOPLE | List People |
| MICROSOFT_TEAMS_TEAMS_POST_CHANNEL_MESSAGE | Post Channel Message |
| MICROSOFT_TEAMS_TEAMS_POST_CHAT_MESSAGE | Send Chat Message |
| MICROSOFT_TEAMS_TEAMS_POST_MESSAGE_REPLY | Reply to Message |
| MICROSOFT_TEAMS_UNARCHIVE_TEAM | Unarchive Team |
| MICROSOFT_TEAMS_UPDATE_CHANNEL_MESSAGE | Update Channel Message |
| MICROSOFT_TEAMS_UPDATE_CHAT_MESSAGE | Update Chat Message |
| MICROSOFT_TEAMS_UPDATE_TEAM | Update Team |

### 4. Prisma Schema

**File: `prisma/schema.prisma`**

Add `TEAMS` to `MessageChannel` enum for type consistency (not for DB storage of messages):

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

### 5. Unified Inbox - Live Fetch API

**New file: `app/api/teams/messages/route.ts`**

REST endpoint for live-fetching Teams messages via Composio (no DB storage):

```
GET /api/teams/messages?type=chats&limit=50
GET /api/teams/messages?type=chat_messages&chatId=xxx&limit=50
GET /api/teams/messages?type=channels&teamId=xxx
GET /api/teams/messages?type=channel_messages&teamId=xxx&channelId=xxx&limit=50
```

Returns normalized message format:
```typescript
interface TeamsMessage {
  id: string;
  content: string;
  sender: { displayName: string; email?: string };
  createdAt: string;
  chatId?: string;
  channelId?: string;
  teamId?: string;
  isReply: boolean;
  // Maps to inbox display format
}
```

**New file: `app/api/teams/messages/send/route.ts`**

POST endpoint for sending replies from inbox:

```
POST /api/teams/messages/send
Body: { type: "chat" | "channel", chatId?, teamId?, channelId?, messageId?, content, contentType? }
```

Uses Composio tools:
- Chat reply: `MICROSOFT_TEAMS_TEAMS_POST_CHAT_MESSAGE`
- Channel reply: `MICROSOFT_TEAMS_TEAMS_POST_MESSAGE_REPLY`
- New channel message: `MICROSOFT_TEAMS_TEAMS_POST_CHANNEL_MESSAGE`

### 6. Inbox UI Wiring

**File: `components/inbox/KinsoInbox.tsx`**

- Fix `integrationChannelMap`: Change `'Teams': ['SLACK']` → `'Teams': ['TEAMS']`
- Add Teams integration status detection via Composio `connectedAccounts.list()`
- When Teams filter is active, fetch from `/api/teams/messages` instead of local DB
- Show Teams messages in same card format as other channels
- Enable reply compose box for Teams messages

**File: `app/(app)/messages/page.tsx`**

- Add Teams to CHANNELS array: `{ id: "TEAMS", label: "Teams", icon: TeamsIcon }`

### 7. Integrations Settings Page

**File: `app/(app)/settings/integrations/page.tsx`**

Add Microsoft Teams to Composio integrations list alongside Google Calendar, ClickUp, Instagram, LinkedIn. Uses existing OAuth connect/disconnect pattern.

**File: `lib/config/platforms.ts`**

Add Teams platform entry with icon and description.

## Data Flow

### AI Chat Flow
```
User asks "send a message to John on Teams"
  → AYA uses MICROSOFT_TEAMS_TEAMS_POST_CHAT_MESSAGE via Composio
  → Tool result streamed back to UI
```

### Inbox View Flow
```
User clicks Teams filter in inbox
  → Frontend calls GET /api/teams/messages?type=chats
  → API authenticates user, gets Composio session
  → Composio calls MICROSOFT_TEAMS_CHATS_GET_ALL_CHATS
  → Normalize response → return to frontend
  → User clicks a chat → fetch messages for that chat
  → Display in inbox format
```

### Inbox Reply Flow
```
User types reply in inbox compose box
  → Frontend calls POST /api/teams/messages/send
  → API uses Composio MICROSOFT_TEAMS_TEAMS_POST_CHAT_MESSAGE
  → Return success/failure → update UI
```

## Key Decisions

1. **No DB storage** for Teams messages (privacy) — live fetch via Composio
2. **Full 34-tool access** in AI Chat for power users
3. **Inbox shows chats + channels** with reply capability
4. **Same Composio pattern** as other integrations — minimal new code
5. **TEAMS enum value** added for type safety even without DB storage
