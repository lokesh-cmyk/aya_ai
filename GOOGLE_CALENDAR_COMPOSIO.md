# Google Calendar + Composio (AI Chat)

Google Calendar is integrated in **AI Chat** via [Composio](https://docs.composio.dev/) with **in-chat authentication** and **Agentic UI**: the AI can prompt users to connect Google Calendar inside the chat, show a Connect button/link, and after OAuth users can manage their calendar from the conversation.

## Flow

1. User asks about calendar (e.g. "what's on my calendar", "list my events").
2. Agent uses Composio meta-tools: `COMPOSIO_SEARCH_TOOLS` to find calendar tools, `COMPOSIO_MANAGE_CONNECTIONS` to check connection.
3. If Google Calendar is not connected, the agent returns a **Connect Link URL**.
4. The chat UI shows **Agentic UI**: a "Connect to Google Calendar" card with a **Connect** button and a "Connect Google Calendar" link.
5. User clicks Connect → OAuth with Google → redirected back to `/ai-chat`.
6. User says "Done" or repeats the request; the agent retries with the connected account and can list/create/update calendar events.

## Environment variables

Add to `.env`:

```env
# Composio (required for Google Calendar in AI Chat)
NEXT_PUBLIC_COMPOSIO_API_KEY=your_composio_api_key
NEXT_PUBLIC_COMPOSIO_PROJECT_ID=your_project_id
COMPOSIO_AUTH_CONFIG_ID=ac_xxxxx
COMPOSIO_AUTH_CONFIG_NAME=google calendar-xxxxx
COMPOSIO_TOOLKIT_SLUG=googlecalendar

# Optional: webhook secret if you use Composio webhooks
COMPOSIO_WEBHOOK_SECRET=your_webhook_secret
```

- **NEXT_PUBLIC_COMPOSIO_API_KEY**: From [Composio dashboard](https://app.composio.dev).
- **COMPOSIO_AUTH_CONFIG_ID**: Your custom auth config ID for Google Calendar (from Composio dashboard → Authentication).
- **COMPOSIO_TOOLKIT_SLUG**: Toolkit slug; use `googlecalendar` for Google Calendar.

Callback URL for OAuth is set to `{NEXT_PUBLIC_APP_URL}/ai-chat` so after connecting, users land back on the chat page.

## Behaviour

- If `NEXT_PUBLIC_COMPOSIO_API_KEY` is **not** set, AI Chat uses Claude-only (no tools, no calendar).
- If it **is** set, the messages API uses Composio + Vercel AI SDK: Claude with Composio meta-tools and Google Calendar tools. If Composio fails, it falls back to Claude-only.
- Connect links from `COMPOSIO_MANAGE_CONNECTIONS` are stored in the assistant message `metadata.connectLink` and `metadata.connectAppName` and rendered as the Connect card in the chat.

## Docs

- [Composio docs](https://docs.composio.dev/llms.txt)
- [In-chat authentication](https://docs.composio.dev/docs/authenticating-users/in-chat-authentication)
