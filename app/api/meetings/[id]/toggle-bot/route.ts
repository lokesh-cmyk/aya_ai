import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getMeetingBaasClient } from "@/lib/meetingbaas";
import { MeetingStatus } from "@/app/generated/prisma/enums";

// Toggle bot exclusion for a specific meeting
export async function PATCH(
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

    // Get the meeting
    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        OR: [
          { userId: session.user.id },
          { team: { users: { some: { id: session.user.id } } } },
        ],
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Parse request body for explicit value or toggle
    const body = await request.json().catch(() => ({}));
    const newExcludedValue = body.botExcluded !== undefined
      ? body.botExcluded
      : !meeting.botExcluded;

    // If we're excluding the bot and it was scheduled to join, try to cancel
    if (newExcludedValue && meeting.botId && meeting.status === MeetingStatus.SCHEDULED) {
      try {
        const client = getMeetingBaasClient();
        await client.deleteBot(meeting.botId);
      } catch (error) {
        console.log("Could not cancel scheduled bot:", error);
        // Continue anyway - the bot might not be active yet
      }
    }

    // Update the meeting
    const updatedMeeting = await prisma.meeting.update({
      where: { id },
      data: {
        botExcluded: newExcludedValue,
        // If excluding and was scheduled, mark as cancelled
        ...(newExcludedValue && meeting.status === MeetingStatus.SCHEDULED
          ? { status: MeetingStatus.CANCELLED }
          : {}),
        // If un-excluding and was cancelled due to exclusion, reset to scheduled
        ...(!newExcludedValue && meeting.status === MeetingStatus.CANCELLED
          ? { status: MeetingStatus.SCHEDULED }
          : {}),
      },
      select: {
        id: true,
        title: true,
        botExcluded: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      meeting: updatedMeeting,
      message: newExcludedValue
        ? "Bot will not join this meeting"
        : "Bot will join this meeting",
    });
  } catch (error) {
    console.error("Toggle bot exclusion error:", error);
    return NextResponse.json(
      { error: "Failed to toggle bot exclusion" },
      { status: 500 }
    );
  }
}
