import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureStreamUsers } from "@/lib/stream/stream-client";

/**
 * Ensure the given user IDs exist in Stream (upsert). Call this before creating
 * a channel so Stream does not return "users don't exist".
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const userIds = Array.isArray(body.userIds) ? body.userIds as string[] : [];
    if (userIds.length === 0) {
      return NextResponse.json({ ok: true, ensured: 0 });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, image: true },
    });

    await ensureStreamUsers(users);
    return NextResponse.json({ ok: true, ensured: users.length });
  } catch (error: any) {
    console.error("[ensure-stream-users] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to ensure Stream users" },
      { status: 500 }
    );
  }
}
