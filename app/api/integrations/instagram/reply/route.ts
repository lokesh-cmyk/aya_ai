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
