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
          : members.map((m: any) => m.displayName).filter(Boolean).join(", ") || "Teams Chat";
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
