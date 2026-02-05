import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MeetingStatus } from "@/app/generated/prisma/enums";

// Regenerate insights for a meeting
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

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    // Verify access and get meeting with transcript
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
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (!meeting.transcript) {
      return NextResponse.json(
        { error: "No transcript available for this meeting" },
        { status: 400 }
      );
    }

    // Update status to processing
    await prisma.meeting.update({
      where: { id },
      data: { status: MeetingStatus.PROCESSING },
    });

    // Delete existing insights
    await prisma.meetingInsight.deleteMany({
      where: { meetingId: id },
    });

    // Trigger insight generation via Inngest
    const { inngest } = await import("@/lib/inngest/client");
    await inngest.send({
      name: "meeting/generate.insights",
      data: {
        meetingId: id,
        transcriptText: meeting.transcript.fullText,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Insight regeneration started",
    });
  } catch (error) {
    console.error("Regenerate insights error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate insights" },
      { status: 500 }
    );
  }
}
