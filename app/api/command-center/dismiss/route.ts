// app/api/command-center/dismiss/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { signalKey, type, snoozeDays } = body;

    if (!signalKey || !type) {
      return NextResponse.json(
        { error: "Missing signalKey or type" },
        { status: 400 }
      );
    }

    if (!["dismiss", "snooze", "acknowledge"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type" },
        { status: 400 }
      );
    }

    const snoozeUntil = type === "snooze" && snoozeDays
      ? new Date(Date.now() + snoozeDays * 24 * 60 * 60 * 1000)
      : null;

    const dismissal = await prisma.signalDismissal.upsert({
      where: {
        userId_signalKey: {
          userId: session.user.id,
          signalKey,
        },
      },
      update: {
        type,
        snoozeUntil,
      },
      create: {
        userId: session.user.id,
        signalKey,
        type,
        snoozeUntil,
      },
    });

    return NextResponse.json({ success: true, dismissal });
  } catch (error) {
    console.error("Dismiss signal error:", error);
    return NextResponse.json(
      { error: "Failed to dismiss signal" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const signalKey = searchParams.get("signalKey");

    if (!signalKey) {
      return NextResponse.json(
        { error: "Missing signalKey" },
        { status: 400 }
      );
    }

    await prisma.signalDismissal.deleteMany({
      where: {
        userId: session.user.id,
        signalKey,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Undismiss signal error:", error);
    return NextResponse.json(
      { error: "Failed to undismiss signal" },
      { status: 500 }
    );
  }
}
