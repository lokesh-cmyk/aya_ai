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
    }
  }

  return allContacts;
}
