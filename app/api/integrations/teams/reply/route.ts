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
