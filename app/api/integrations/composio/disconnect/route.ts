import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getComposio } from "@/lib/composio-tools";

/** DELETE ?connectedAccountId=ca_xxx - Disconnect a specific Composio connected account */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connectedAccountId = request.nextUrl.searchParams.get("connectedAccountId");
    if (!connectedAccountId) {
      return NextResponse.json({ error: "connectedAccountId is required" }, { status: 400 });
    }

    const composio = getComposio();

    // Verify the account belongs to this user
    const list = await composio.connectedAccounts.list({
      userIds: [session.user.id],
      statuses: ["ACTIVE"],
    });
    const items = (list as { items?: Array<any> }).items ?? [];
    const account = items.find((item: any) => item.id === connectedAccountId);
    if (!account) {
      return NextResponse.json({ error: "Connected account not found" }, { status: 404 });
    }

    // Delete the connection via Composio
    await composio.connectedAccounts.delete(connectedAccountId);

    // Clear Redis cache for this account
    try {
      const { getRedis } = await import("@/lib/redis");
      const redis = getRedis();
      await redis.del(`instagram:messages:${session.user.id}:${connectedAccountId}`);
    } catch {
      // Redis not configured or unavailable — non-fatal
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[composio/disconnect]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to disconnect" },
      { status: 500 }
    );
  }
}
