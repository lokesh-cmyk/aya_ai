// app/api/command-center/signals/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAccessibleSpaceIds,
  detectShippedSignals,
  detectStaleSignals,
  detectBlockedSignals,
  detectOverdueSignals,
  detectCommGapSignals,
  detectBottleneckSignals,
  calculateVelocityTrend,
  createVelocitySignal,
} from "@/lib/command-center/signals";
import { Signal, SignalSummary, CommandCenterResponse } from "@/lib/command-center/types";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true, role: true },
    });

    if (!user?.teamId) {
      return NextResponse.json({
        signals: [],
        summary: { total: 0, byType: {}, bySpace: {} },
        velocityTrend: { thisWeek: 0, lastWeek: 0, percentChange: 0 },
      });
    }

    const { searchParams } = new URL(request.url);
    const spaceIdFilter = searchParams.get("spaceId");

    // Get accessible spaces based on role
    let spaceIds = await getAccessibleSpaceIds(
      session.user.id,
      user.teamId,
      user.role || "VIEWER"
    );

    // Apply additional filter if specified
    if (spaceIdFilter && spaceIds) {
      spaceIds = spaceIds.includes(spaceIdFilter) ? [spaceIdFilter] : [];
    } else if (spaceIdFilter && !spaceIds) {
      spaceIds = [spaceIdFilter];
    }

    // Get dismissed/snoozed signals
    const dismissals = await prisma.signalDismissal.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { type: "dismiss" },
          { type: "snooze", snoozeUntil: { gt: new Date() } },
        ],
      },
      select: { signalKey: true },
    });

    const dismissedKeys = new Set(dismissals.map((d) => d.signalKey));

    // Fetch all signals in parallel
    const [
      shipped,
      stale,
      blocked,
      overdue,
      commGap,
      bottleneck,
      velocity,
    ] = await Promise.all([
      detectShippedSignals(user.teamId, spaceIds),
      detectStaleSignals(user.teamId, spaceIds),
      detectBlockedSignals(user.teamId, spaceIds),
      detectOverdueSignals(user.teamId, spaceIds),
      detectCommGapSignals(user.teamId),
      detectBottleneckSignals(user.teamId, spaceIds),
      calculateVelocityTrend(user.teamId, spaceIds),
    ]);

    // Combine and filter dismissed signals
    let allSignals: Signal[] = [
      ...blocked,
      ...overdue,
      ...bottleneck,
      ...stale,
      ...commGap,
      ...shipped,
    ].filter((s) => !dismissedKeys.has(s.id));

    // Add velocity signal if applicable
    const velocitySignal = createVelocitySignal(velocity);
    if (velocitySignal && !dismissedKeys.has(velocitySignal.id)) {
      allSignals.push(velocitySignal);
    }

    // Calculate summary
    const summary: SignalSummary = {
      total: allSignals.filter((s) => s.type !== "shipped").length,
      byType: {
        shipped: allSignals.filter((s) => s.type === "shipped").length,
        stale: allSignals.filter((s) => s.type === "stale").length,
        blocked: allSignals.filter((s) => s.type === "blocked").length,
        overdue: allSignals.filter((s) => s.type === "overdue").length,
        bottleneck: allSignals.filter((s) => s.type === "bottleneck").length,
        comm_gap: allSignals.filter((s) => s.type === "comm_gap").length,
        velocity: allSignals.filter((s) => s.type === "velocity").length,
      },
      bySpace: {},
    };

    // Group by space
    for (const signal of allSignals) {
      if (signal.spaceId) {
        summary.bySpace[signal.spaceId] = (summary.bySpace[signal.spaceId] || 0) + 1;
      }
    }

    const response: CommandCenterResponse = {
      signals: allSignals,
      summary,
      velocityTrend: velocity,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Command center signals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch signals" },
      { status: 500 }
    );
  }
}
