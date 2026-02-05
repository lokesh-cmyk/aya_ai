import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { MeetingPlatform, MeetingStatus } from "@/app/generated/prisma/enums";

const createMeetingSchema = z.object({
  title: z.string().min(1, "Meeting title is required"),
  description: z.string().optional(),
  meetingUrl: z.string().url("Valid meeting URL is required"),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime().optional(),
});

// Get all meetings for user
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as MeetingStatus | null;
    const filter = searchParams.get("filter"); // "upcoming", "past", "all"
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    // Build where clause with proper AND/OR logic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      AND: [
        // User must own the meeting or be in the same team
        {
          OR: [
            { userId: session.user.id },
            ...(user?.teamId ? [{ teamId: user.teamId }] : []),
          ],
        },
      ],
    };

    // Filter by status
    if (status && Object.values(MeetingStatus).includes(status)) {
      where.AND.push({ status });
    }

    // Filter by time
    const now = new Date();
    if (filter === "upcoming") {
      where.AND.push({ scheduledStart: { gte: now } });
    } else if (filter === "past") {
      where.AND.push({ scheduledStart: { lt: now } });
    }

    // Search
    if (search) {
      where.AND.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    // Fetch meetings
    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        include: {
          transcript: {
            select: { id: true, wordCount: true },
          },
          insights: {
            select: { id: true, type: true },
          },
          participants: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              insights: true,
              participants: true,
            },
          },
        },
        orderBy: { scheduledStart: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.meeting.count({ where }),
    ]);

    return NextResponse.json({
      meetings,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + meetings.length < total,
      },
    });
  } catch (error) {
    console.error("Get meetings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch meetings" },
      { status: 500 }
    );
  }
}

// Create a new meeting manually
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createMeetingSchema.parse(body);

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    // Detect platform from URL
    const platform = detectPlatform(validated.meetingUrl);

    const meeting = await prisma.meeting.create({
      data: {
        title: validated.title,
        description: validated.description,
        meetingUrl: validated.meetingUrl,
        platform,
        status: MeetingStatus.SCHEDULED,
        scheduledStart: new Date(validated.scheduledStart),
        scheduledEnd: validated.scheduledEnd
          ? new Date(validated.scheduledEnd)
          : null,
        userId: session.user.id,
        teamId: user?.teamId,
      },
    });

    // Schedule bot to join this meeting
    const { inngest } = await import("@/lib/inngest/client");

    // Get bot settings
    const botSettings = await prisma.meetingBotSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (botSettings?.autoJoinEnabled) {
      await inngest.send({
        name: "meeting/schedule.bot",
        data: {
          meetingId: meeting.id,
          userId: session.user.id,
          botSettingsId: botSettings.id,
        },
      });
    }

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    console.error("Create meeting error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create meeting" },
      { status: 500 }
    );
  }
}

function detectPlatform(url: string): MeetingPlatform {
  if (url.includes("meet.google.com")) {
    return MeetingPlatform.GOOGLE_MEET;
  } else if (url.includes("zoom.us") || url.includes("zoom.com")) {
    return MeetingPlatform.ZOOM;
  } else if (
    url.includes("teams.microsoft.com") ||
    url.includes("teams.live.com")
  ) {
    return MeetingPlatform.MICROSOFT_TEAMS;
  }
  return MeetingPlatform.GOOGLE_MEET;
}
