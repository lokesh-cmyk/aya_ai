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
    concurrency: { limit: 1 },
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

      const syncedCount = await step.run(`sync-user-${userId}`, async () => {
        let synced = 0;
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
            synced++;
          } catch (err) {
            logger.warn(`Failed to sync Instagram account ${account.id} for user ${userId}`, { error: String(err) });
          }
        }

        // Set TTL on accounts hash once per user (after all accounts processed)
        if (synced > 0) {
          await redis.expire(`instagram:accounts:${userId}`, CACHE_TTL_SECONDS);
        }

        // Update last sync timestamp
        await redis.set(`instagram:sync:last:${userId}`, new Date().toISOString(), { ex: CACHE_TTL_SECONDS });

        return synced;
      });

      totalSynced += syncedCount ?? 0;
    }

    return { synced: totalSynced, users: userIds.length };
  }
);
