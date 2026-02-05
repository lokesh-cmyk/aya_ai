import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MeetingPlatform, MeetingStatus } from "@/app/generated/prisma/enums";

// Detect meeting platform from URL
function detectPlatform(url: string): MeetingPlatform {
  if (url.includes("meet.google.com")) return MeetingPlatform.GOOGLE_MEET;
  if (url.includes("zoom.us") || url.includes("zoom.com")) return MeetingPlatform.ZOOM;
  if (url.includes("teams.microsoft.com") || url.includes("teams.live.com")) return MeetingPlatform.MICROSOFT_TEAMS;
  return MeetingPlatform.GOOGLE_MEET;
}

/**
 * Create a meeting from a calendar event
 * This is used when user toggles bot for a calendar event that hasn't been synced yet
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
    const body = await request.json();
    const { eventId, title, meetingUrl, startTime, endTime, botExcluded = false } = body;

    if (!eventId || !meetingUrl || !startTime) {
      return NextResponse.json(
        { error: "Missing required fields: eventId, meetingUrl, startTime" },
        { status: 400 }
      );
    }

    // Check if meeting already exists for this calendar event
    const existingMeeting = await prisma.meeting.findFirst({
      where: {
        userId,
        calendarEventId: eventId,
      },
    });

    if (existingMeeting) {
      // Update existing meeting's botExcluded status
      const updated = await prisma.meeting.update({
        where: { id: existingMeeting.id },
        data: { botExcluded },
      });

      // If enabling bot and meeting doesn't have a bot scheduled yet
      if (!botExcluded && !existingMeeting.botId && existingMeeting.status === "SCHEDULED") {
        try {
          const { inngest } = await import("@/lib/inngest/client");

          let botSettings = await prisma.meetingBotSettings.findUnique({
            where: { userId },
          });

          if (!botSettings) {
            botSettings = await prisma.meetingBotSettings.create({
              data: {
                userId,
                botName: "AYA Meeting Assistant",
                autoJoinEnabled: true,
              },
            });
          }

          await inngest.send({
            name: "meeting/schedule.bot",
            data: {
              meetingId: existingMeeting.id,
              userId,
              botSettingsId: botSettings.id,
            },
          });
        } catch (botError) {
          console.error("[from-calendar-event] Failed to schedule bot:", botError);
        }
      }

      return NextResponse.json({
        meeting: updated,
        created: false,
        message: botExcluded ? "Bot disabled for this meeting" : "Bot enabled for this meeting",
      });
    }

    // Create new meeting from calendar event
    const platform = detectPlatform(meetingUrl);
    const meeting = await prisma.meeting.create({
      data: {
        title: title || "Untitled Meeting",
        meetingUrl,
        platform,
        status: MeetingStatus.SCHEDULED,
        scheduledStart: new Date(startTime),
        scheduledEnd: endTime ? new Date(endTime) : null,
        calendarEventId: eventId,
        botExcluded,
        userId,
      },
    });

    // If bot is enabled, schedule it to join
    if (!botExcluded) {
      try {
        const { inngest } = await import("@/lib/inngest/client");

        // Get or create bot settings
        let botSettings = await prisma.meetingBotSettings.findUnique({
          where: { userId },
        });

        if (!botSettings) {
          botSettings = await prisma.meetingBotSettings.create({
            data: {
              userId,
              botName: "AYA Meeting Assistant",
              autoJoinEnabled: true,
            },
          });
        }

        await inngest.send({
          name: "meeting/schedule.bot",
          data: {
            meetingId: meeting.id,
            userId,
            botSettingsId: botSettings.id,
          },
        });
      } catch (botError) {
        console.error("[from-calendar-event] Failed to schedule bot:", botError);
        // Don't fail the request, meeting is still created
      }
    }

    return NextResponse.json({
      meeting,
      created: true,
      message: botExcluded ? "Meeting added (bot disabled)" : "Meeting added (bot will join)",
    });
  } catch (error) {
    console.error("[from-calendar-event] Error:", error);
    return NextResponse.json(
      { error: "Failed to create meeting from calendar event" },
      { status: 500 }
    );
  }
}
