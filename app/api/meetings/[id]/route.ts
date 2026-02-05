import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { getMeetingBaasClient } from "@/lib/meetingbaas";
import { MeetingStatus } from "@/app/generated/prisma/enums";

const updateMeetingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(MeetingStatus).optional(),
});

// Get meeting by ID
export async function GET(
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

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        OR: [
          { userId: session.user.id },
          ...(user?.teamId ? [{ teamId: user.teamId }] : []),
        ],
      },
      include: {
        transcript: true,
        insights: {
          orderBy: { createdAt: "asc" },
        },
        participants: {
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Parse insights content for structured data
    const parsedInsights = meeting.insights.map((insight) => {
      let parsedContent = insight.content;
      try {
        // Try to parse as JSON for structured types
        if (
          ["key_topics", "action_items", "decisions", "follow_up_questions"].includes(
            insight.type
          )
        ) {
          parsedContent = JSON.parse(insight.content);
        }
      } catch {
        // Keep as string if not valid JSON
      }
      return {
        ...insight,
        parsedContent,
      };
    });

    return NextResponse.json({
      meeting: {
        ...meeting,
        insights: parsedInsights,
      },
    });
  } catch (error) {
    console.error("Get meeting error:", error);
    return NextResponse.json(
      { error: "Failed to fetch meeting" },
      { status: 500 }
    );
  }
}

// Update meeting
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
    const body = await request.json();
    const validated = updateMeetingSchema.parse(body);

    // Verify ownership
    const existing = await prisma.meeting.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Meeting not found or access denied" },
        { status: 404 }
      );
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error("Update meeting error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update meeting" },
      { status: 500 }
    );
  }
}

// Delete meeting
export async function DELETE(
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
    const existing = await prisma.meeting.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Meeting not found or access denied" },
        { status: 404 }
      );
    }

    // If bot is active, remove it
    if (
      existing.botId &&
      (existing.status === MeetingStatus.JOINING ||
        existing.status === MeetingStatus.IN_PROGRESS)
    ) {
      try {
        const client = getMeetingBaasClient();
        await client.deleteBot(existing.botId);
      } catch (error) {
        console.error("Failed to remove bot:", error);
        // Continue with deletion even if bot removal fails
      }
    }

    // Delete meeting (cascades to transcript, insights, participants)
    await prisma.meeting.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete meeting error:", error);
    return NextResponse.json(
      { error: "Failed to delete meeting" },
      { status: 500 }
    );
  }
}
