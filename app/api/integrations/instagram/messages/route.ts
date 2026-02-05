/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getComposio, COMPOSIO_APPS } from "@/lib/composio-tools";

/** GET - Fetch Instagram DMs via Composio, return unified inbox contact format */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ contacts: [], total: 0, messageCount: 0 });
    }

    const composio = getComposio();

    // Get user's connected Instagram account
    const list = await composio.connectedAccounts.list({
      userIds: [session.user.id],
      statuses: ["ACTIVE"],
      toolkitSlugs: [COMPOSIO_APPS.instagram.slug],
    });
    const items = (list as { items?: Array<{ id: string }> }).items ?? [];
    const instagramAccount = items[0];
    if (!instagramAccount?.id) {
      return NextResponse.json({
        contacts: [],
        total: 0,
        messageCount: 0,
      });
    }

    const connectedAccountId = instagramAccount.id;

    // List all Instagram conversations
    let conversationsResponse: any;
    try {
      conversationsResponse = await composio.tools.execute("INSTAGRAM_LIST_ALL_CONVERSATIONS", {
        userId: session.user.id,
        connectedAccountId,
        arguments: {},
        dangerouslySkipVersionCheck: true,
      });
    } catch (err) {
      console.warn("[instagram/messages] INSTAGRAM_LIST_ALL_CONVERSATIONS failed:", err);
      return NextResponse.json({ contacts: [], total: 0, messageCount: 0 });
    }

    const raw = (conversationsResponse as any).data ?? conversationsResponse;
    const conversations = Array.isArray(raw) ? raw : raw?.conversations ?? raw?.data ?? [];
    const convList = Array.isArray(conversations) ? conversations : [];

    const contactsMap = new Map<string, any>();

    for (const conv of convList) {
      const convId = conv.id ?? conv.conversation_id ?? conv.conversationId ?? String(conv);
      const participants = conv.participants ?? conv.users ?? [];
      const other = Array.isArray(participants)
        ? participants.find((p: any) => p?.username || p?.id) ?? participants[0]
        : null;
      const contactName =
        (typeof other === "object" && (other?.username ?? other?.name ?? other?.full_name)) ||
        (typeof conv === "object" && (conv.name ?? conv.title)) ||
        `Conversation ${convId}`;

      const contactKey = `instagram_${convId}`;
      if (!contactsMap.has(contactKey)) {
        contactsMap.set(contactKey, {
          id: contactKey,
          name: contactName,
          email: undefined,
          phone: undefined,
          messages: [],
          _count: { messages: 0 },
          isInstagram: true,
          conversationId: convId,
        });
      }
      const contact = contactsMap.get(contactKey)!;

      // Fetch messages for this conversation
      let messagesResponse: any;
      try {
        messagesResponse = await composio.tools.execute("INSTAGRAM_LIST_ALL_MESSAGES", {
          userId: session.user.id,
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

      for (const msg of messages) {
        const fromId = msg.sender_id ?? msg.from?.id ?? msg.from?.username ?? msg.from;
        const fromName =
          (typeof msg.from === "object" && (msg.from?.username ?? msg.from?.name)) ?? String(fromId);
        const content = msg.text ?? msg.message ?? msg.content ?? "";
        const msgId = msg.id ?? msg.message_id ?? `ig_${convId}_${fromId}_${Date.now()}`;
        const createdAt = msg.created_time ?? msg.created_at ?? msg.timestamp ?? new Date().toISOString();
        const isInbound = msg.direction !== "OUTBOUND" && msg.direction !== "outbound";

        contact.messages.push({
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
          },
          from: fromName,
          createdAt: typeof createdAt === "string" ? createdAt : new Date(createdAt).toISOString(),
          readAt: null,
        });
      }
      contact._count.messages = contact.messages.length;
      contact.messages.sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    const contacts = Array.from(contactsMap.values());
    const messageCount = contacts.reduce((sum, c) => sum + (c.messages?.length ?? 0), 0);

    return NextResponse.json({
      contacts,
      total: contacts.length,
      messageCount,
    });
  } catch (e) {
    console.warn("[instagram/messages]", e);
    return NextResponse.json({
      contacts: [],
      total: 0,
      messageCount: 0,
    });
  }
}
