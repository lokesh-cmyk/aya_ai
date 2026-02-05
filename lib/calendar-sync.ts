import { prisma } from "@/lib/prisma";
import { getComposio, COMPOSIO_APPS } from "@/lib/composio-tools";
import { MeetingPlatform, MeetingStatus } from "@/app/generated/prisma/enums";

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  status?: string; // "confirmed", "tentative", "cancelled"
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  hangoutLink?: string;
  htmlLink?: string;
  updated?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
    }>;
  };
  attendees?: Array<{ email: string; displayName?: string }>;
}

interface SyncResult {
  created: number;
  updated: number;
  cancelled: number;
  unchanged: number;
  errors: string[];
}

interface CalendarChange {
  type: "created" | "updated" | "rescheduled" | "cancelled" | "deleted";
  eventId: string;
  meetingId?: string;
  title?: string;
  changes?: { field: string; oldValue: string; newValue: string }[];
}

// Extract meeting URL from a calendar event
function extractMeetingUrl(event: GoogleCalendarEvent): string | null {
  if (event.hangoutLink) return event.hangoutLink;

  if (event.conferenceData?.entryPoints) {
    for (const entry of event.conferenceData.entryPoints) {
      if (entry.entryPointType === "video" && entry.uri) {
        return entry.uri;
      }
    }
  }

  const description = event.description || "";
  const urlPatterns = [
    /https:\/\/meet\.google\.com\/[a-z-]+/gi,
    /https:\/\/[\w.-]*zoom\.(us|com)\/j\/\d+/gi,
    /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s]+/gi,
    /https:\/\/teams\.live\.com\/meet\/[^\s]+/gi,
  ];

  for (const pattern of urlPatterns) {
    const match = description.match(pattern);
    if (match) return match[0];
  }

  return null;
}

// Detect meeting platform from URL
function detectPlatform(url: string): MeetingPlatform {
  if (url.includes("meet.google.com")) return MeetingPlatform.GOOGLE_MEET;
  if (url.includes("zoom.us") || url.includes("zoom.com")) return MeetingPlatform.ZOOM;
  if (url.includes("teams.microsoft.com") || url.includes("teams.live.com"))
    return MeetingPlatform.MICROSOFT_TEAMS;
  return MeetingPlatform.GOOGLE_MEET;
}

/**
 * Sync calendar events with database meetings
 * Detects new, updated, rescheduled, cancelled, and deleted events
 */
export async function syncCalendarWithDatabase(
  userId: string,
  calendarEvents: GoogleCalendarEvent[]
): Promise<{ result: SyncResult; changes: CalendarChange[] }> {
  const result: SyncResult = {
    created: 0,
    updated: 0,
    cancelled: 0,
    unchanged: 0,
    errors: [],
  };
  const changes: CalendarChange[] = [];

  // Get all existing meetings for this user with calendar event IDs
  const existingMeetings = await prisma.meeting.findMany({
    where: {
      userId,
      calendarEventId: { not: null },
    },
    select: {
      id: true,
      calendarEventId: true,
      title: true,
      scheduledStart: true,
      scheduledEnd: true,
      status: true,
      meetingUrl: true,
    },
  });

  const meetingsByEventId = new Map(
    existingMeetings.map((m) => [m.calendarEventId, m])
  );

  const processedEventIds = new Set<string>();

  // Process each calendar event
  for (const event of calendarEvents) {
    const meetingUrl = extractMeetingUrl(event);

    // Skip events without meeting URLs
    if (!meetingUrl) continue;

    processedEventIds.add(event.id);
    const existingMeeting = meetingsByEventId.get(event.id);

    const eventStartTime = event.start.dateTime || event.start.date || "";
    const eventEndTime = event.end.dateTime || event.end.date || "";

    // Check if event is cancelled in Google Calendar
    if (event.status === "cancelled") {
      if (existingMeeting && existingMeeting.status !== MeetingStatus.CANCELLED) {
        try {
          await prisma.meeting.update({
            where: { id: existingMeeting.id },
            data: { status: MeetingStatus.CANCELLED },
          });
          result.cancelled++;
          changes.push({
            type: "cancelled",
            eventId: event.id,
            meetingId: existingMeeting.id,
            title: existingMeeting.title,
          });
        } catch (error) {
          result.errors.push(`Failed to cancel meeting ${existingMeeting.id}: ${error}`);
        }
      }
      continue;
    }

    if (existingMeeting) {
      // Check for updates
      const meetingChanges: CalendarChange["changes"] = [];
      const updateData: Record<string, unknown> = {};

      // Check title change
      if (event.summary && event.summary !== existingMeeting.title) {
        meetingChanges.push({
          field: "title",
          oldValue: existingMeeting.title,
          newValue: event.summary,
        });
        updateData.title = event.summary;
      }

      // Check time changes (rescheduled)
      const newStart = new Date(eventStartTime);
      const oldStart = new Date(existingMeeting.scheduledStart);
      if (newStart.getTime() !== oldStart.getTime()) {
        meetingChanges.push({
          field: "scheduledStart",
          oldValue: oldStart.toISOString(),
          newValue: newStart.toISOString(),
        });
        updateData.scheduledStart = newStart;
      }

      if (eventEndTime && existingMeeting.scheduledEnd) {
        const newEnd = new Date(eventEndTime);
        const oldEnd = new Date(existingMeeting.scheduledEnd);
        if (newEnd.getTime() !== oldEnd.getTime()) {
          meetingChanges.push({
            field: "scheduledEnd",
            oldValue: oldEnd.toISOString(),
            newValue: newEnd.toISOString(),
          });
          updateData.scheduledEnd = newEnd;
        }
      }

      // Check URL change
      if (meetingUrl !== existingMeeting.meetingUrl) {
        meetingChanges.push({
          field: "meetingUrl",
          oldValue: existingMeeting.meetingUrl || "",
          newValue: meetingUrl,
        });
        updateData.meetingUrl = meetingUrl;
        updateData.platform = detectPlatform(meetingUrl);
      }

      if (Object.keys(updateData).length > 0) {
        try {
          await prisma.meeting.update({
            where: { id: existingMeeting.id },
            data: updateData,
          });
          result.updated++;
          changes.push({
            type: meetingChanges.some((c) => c.field === "scheduledStart")
              ? "rescheduled"
              : "updated",
            eventId: event.id,
            meetingId: existingMeeting.id,
            title: event.summary || existingMeeting.title,
            changes: meetingChanges,
          });
        } catch (error) {
          result.errors.push(`Failed to update meeting ${existingMeeting.id}: ${error}`);
        }
      } else {
        result.unchanged++;
      }
    } else {
      // Create new meeting
      try {
        const newMeeting = await prisma.meeting.create({
          data: {
            title: event.summary || "Untitled Meeting",
            meetingUrl,
            platform: detectPlatform(meetingUrl),
            status: MeetingStatus.SCHEDULED,
            scheduledStart: new Date(eventStartTime),
            scheduledEnd: eventEndTime ? new Date(eventEndTime) : null,
            calendarEventId: event.id,
            userId,
          },
        });
        result.created++;
        changes.push({
          type: "created",
          eventId: event.id,
          meetingId: newMeeting.id,
          title: event.summary || "Untitled Meeting",
        });
      } catch (error) {
        result.errors.push(`Failed to create meeting for event ${event.id}: ${error}`);
      }
    }
  }

  // Check for deleted events (events that exist in DB but not in calendar)
  for (const meeting of existingMeetings) {
    if (
      meeting.calendarEventId &&
      !processedEventIds.has(meeting.calendarEventId) &&
      meeting.status !== MeetingStatus.CANCELLED &&
      meeting.status !== MeetingStatus.COMPLETED
    ) {
      // This meeting's calendar event was deleted
      try {
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { status: MeetingStatus.CANCELLED },
        });
        result.cancelled++;
        changes.push({
          type: "deleted",
          eventId: meeting.calendarEventId,
          meetingId: meeting.id,
          title: meeting.title,
        });
      } catch (error) {
        result.errors.push(`Failed to mark meeting ${meeting.id} as cancelled: ${error}`);
      }
    }
  }

  return { result, changes };
}

/**
 * Fetch calendar events from Composio and sync with database
 */
export async function performCalendarSync(userId: string): Promise<{
  success: boolean;
  result?: SyncResult;
  changes?: CalendarChange[];
  error?: string;
}> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
    if (!apiKey) {
      return { success: false, error: "Composio not configured" };
    }

    const composio = getComposio();

    // Check if user has Google Calendar connected
    const connectedAccounts = await composio.connectedAccounts.list({
      userIds: [userId],
      statuses: ["ACTIVE"],
      toolkitSlugs: [COMPOSIO_APPS.googlecalendar.slug],
    });

    const items = (connectedAccounts as { items?: Array<{ id: string; toolkit?: { slug?: string } }> }).items ?? [];
    const calendarConnection = items.find(
      (i) => (i.toolkit?.slug ?? "").toLowerCase() === COMPOSIO_APPS.googlecalendar.slug.toLowerCase()
    );

    if (!calendarConnection) {
      return { success: false, error: "Google Calendar not connected" };
    }

    // Fetch events for next 30 days
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const result = await composio.tools.execute("GOOGLECALENDAR_FIND_EVENT", {
      userId,
      connectedAccountId: calendarConnection.id,
      arguments: {
        calendar_id: "primary",
        timeMin: now.toISOString(),
        timeMax: endDate.toISOString(),
        max_results: 100,
        single_events: true,
        order_by: "startTime",
      },
      dangerouslySkipVersionCheck: true,
    });

    const data = result as {
      data?: { items?: GoogleCalendarEvent[] };
      items?: GoogleCalendarEvent[];
      response_data?: { items?: GoogleCalendarEvent[] };
      error?: string;
    };

    if (data.error) {
      return { success: false, error: data.error };
    }

    const events = data.data?.items || data.items || data.response_data?.items || [];

    // Sync with database
    const syncResult = await syncCalendarWithDatabase(userId, events);

    console.log(`[calendar-sync] User ${userId}: created=${syncResult.result.created}, updated=${syncResult.result.updated}, cancelled=${syncResult.result.cancelled}`);

    return {
      success: true,
      result: syncResult.result,
      changes: syncResult.changes,
    };
  } catch (error) {
    console.error("[calendar-sync] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get last sync timestamp for a user
 */
export async function getLastSyncTime(userId: string): Promise<Date | null> {
  const lastMeeting = await prisma.meeting.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });
  return lastMeeting?.updatedAt || null;
}
