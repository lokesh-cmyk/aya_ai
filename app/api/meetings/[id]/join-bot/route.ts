import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MeetingStatus } from "@/app/generated/prisma/enums";

// Manually trigger bot to join a meeting
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Check if bot is already active
    if (
      meeting.status === MeetingStatus.JOINING ||
      meeting.status === MeetingStatus.IN_PROGRESS
    ) {
      return NextResponse.json(
        { error: "Bot is already active for this meeting" },
        { status: 400 }
      );
    }

    // Get or create bot settings
    let botSettings = await prisma.meetingBotSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!botSettings) {
      botSettings = await prisma.meetingBotSettings.create({
        data: {
          userId: session.user.id,
          botName: "AYA Meeting Assistant",
          autoJoinEnabled: true,
        },
      });
    }

    // Trigger bot deployment via Inngest
    const { inngest } = await import("@/lib/inngest/client");
    await inngest.send({
      name: "meeting/schedule.bot",
      data: {
        meetingId: id,
        userId: session.user.id,
        botSettingsId: botSettings.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Bot is joining the meeting",
    });
  } catch (error) {
    console.error("Join bot error:", error);
    return NextResponse.json(
      { error: "Failed to join meeting" },
      { status: 500 }
    );
  }
}
