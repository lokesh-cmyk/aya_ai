import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { performCalendarSync, getLastSyncTime } from "@/lib/calendar-sync";

/**
 * Trigger a calendar sync for the authenticated user
 * Returns sync results and any changes detected
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    console.log(`[sync] Starting calendar sync for user ${userId}`);
    const startTime = Date.now();

    const syncResult = await performCalendarSync(userId);

    const duration = Date.now() - startTime;
    console.log(`[sync] Completed in ${duration}ms`);

    if (!syncResult.success) {
      return NextResponse.json({
        success: false,
        error: syncResult.error,
        syncedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      result: syncResult.result,
      changes: syncResult.changes,
      syncedAt: new Date().toISOString(),
      duration,
    });
  } catch (error) {
    console.error("[sync] Error:", error);
    return NextResponse.json(
      { error: "Failed to sync calendar" },
      { status: 500 }
    );
  }
}

/**
 * Get sync status and last sync time
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lastSyncTime = await getLastSyncTime(session.user.id);

    return NextResponse.json({
      lastSyncTime: lastSyncTime?.toISOString() || null,
    });
  } catch (error) {
    console.error("[sync-status] Error:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}
