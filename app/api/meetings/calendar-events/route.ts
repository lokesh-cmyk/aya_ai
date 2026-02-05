import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getComposio, COMPOSIO_APPS } from "@/lib/composio-tools";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
    }>;
  };
  attendees?: Array<{ email: string; displayName?: string }>;
}

// Extract meeting URL from a calendar event
function extractMeetingUrl(event: CalendarEvent): string | null {
  // Check hangoutLink (Google Meet)
  if (event.hangoutLink) {
    return event.hangoutLink;
  }

  // Check conferenceData entry points
  if (event.conferenceData?.entryPoints) {
    for (const entry of event.conferenceData.entryPoints) {
      if (entry.entryPointType === "video" && entry.uri) {
        return entry.uri;
      }
    }
  }

  // Check description for meeting URLs
  const description = event.description || "";
  const urlPatterns = [
    /https:\/\/meet\.google\.com\/[a-z-]+/gi,
    /https:\/\/[\w.-]*zoom\.(us|com)\/j\/\d+/gi,
    /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s]+/gi,
    /https:\/\/teams\.live\.com\/meet\/[^\s]+/gi,
  ];

  for (const pattern of urlPatterns) {
    const match = description.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return null;
}

// Fetch upcoming calendar events from Composio Google Calendar
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if Composio API key is set
    const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        events: [],
        connected: false,
        message: "Composio not configured",
      });
    }

    // Check if user has Google Calendar connected via Composio
    const composio = getComposio();

    let connectedAccounts;
    try {
      connectedAccounts = await composio.connectedAccounts.list({
        userIds: [userId],
        statuses: ["ACTIVE"],
        toolkitSlugs: [COMPOSIO_APPS.googlecalendar.slug],
      });
    } catch (error) {
      console.error("[calendar-events] Error checking Composio connection:", error);
      return NextResponse.json({
        events: [],
        connected: false,
        message: "Failed to check calendar connection",
      });
    }

    const items = (connectedAccounts as { items?: Array<{ id: string; toolkit?: { slug?: string } }> }).items ?? [];
    const calendarConnection = items.find(
      (i) => (i.toolkit?.slug ?? "").toLowerCase() === COMPOSIO_APPS.googlecalendar.slug.toLowerCase()
    );

    if (!calendarConnection) {
      return NextResponse.json({
        events: [],
        connected: false,
        message: "Google Calendar not connected",
      });
    }

    console.log("[calendar-events] Found Composio calendar connection:", calendarConnection.id);

    // Get query params for date range (default: next 7 days)
    const searchParams = request.nextUrl.searchParams;
    const daysAhead = parseInt(searchParams.get("days") || "7", 10);
    const includePast = searchParams.get("includePast") === "true";

    const now = new Date();
    const startDate = includePast
      ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      : now;
    const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    // Execute Google Calendar FIND_EVENT action using Composio tools.execute
    let calendarEvents: CalendarEvent[] = [];
    try {
      const result = await composio.tools.execute("GOOGLECALENDAR_FIND_EVENT", {
        userId: userId,
        connectedAccountId: calendarConnection.id,
        arguments: {
          calendar_id: "primary",
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          max_results: 50,
          single_events: true,
          order_by: "startTime",
        },
        dangerouslySkipVersionCheck: true,
      });

      console.log("[calendar-events] Composio action result:", JSON.stringify(result, null, 2));

      // Extract events from result - handle various response formats
      // The response structure is { data: { items: [...] }, successful: boolean }
      const response = result as {
        data?: { items?: CalendarEvent[] };
        items?: CalendarEvent[];
        response_data?: { items?: CalendarEvent[] };
        successful?: boolean;
        error?: string;
      };

      if (response.error) {
        console.error("[calendar-events] Composio returned error:", response.error);
        return NextResponse.json({
          events: [],
          connected: true,
          error: response.error,
        });
      }

      calendarEvents = response.data?.items || response.items || response.response_data?.items || [];
    } catch (actionError) {
      console.error("[calendar-events] Error executing calendar action:", actionError);
      return NextResponse.json({
        events: [],
        connected: true,
        error: actionError instanceof Error ? actionError.message : "Failed to fetch calendar events",
      });
    }

    console.log(`[calendar-events] Found ${calendarEvents.length} calendar events`);

    // Get existing meetings to cross-reference
    const eventIds = calendarEvents.map((e) => e.id).filter(Boolean);
    const existingMeetings = eventIds.length > 0
      ? await prisma.meeting.findMany({
          where: {
            userId,
            calendarEventId: { in: eventIds },
          },
          select: {
            id: true,
            calendarEventId: true,
            status: true,
            botExcluded: true,
            botId: true,
          },
        })
      : [];

    const meetingsByEventId = new Map(
      existingMeetings.map((m) => [m.calendarEventId, m])
    );

    // Transform and enrich events
    const enrichedEvents = calendarEvents.map((event) => {
      const meetingUrl = extractMeetingUrl(event);
      const existingMeeting = meetingsByEventId.get(event.id);
      const startTime = event.start.dateTime || event.start.date || "";
      const endTime = event.end.dateTime || event.end.date || "";

      return {
        event_id: event.id,
        summary: event.summary || "Untitled Event",
        description: event.description,
        start_time: startTime,
        end_time: endTime,
        meeting_url: meetingUrl,
        html_link: event.htmlLink,
        attendees: event.attendees?.map((a) => ({
          email: a.email,
          name: a.displayName,
        })),
        // Enriched from our system
        meetingId: existingMeeting?.id || null,
        meetingStatus: existingMeeting?.status || null,
        botExcluded: existingMeeting?.botExcluded || false,
        hasBotScheduled: !!existingMeeting?.botId || (existingMeeting?.status !== "SCHEDULED" && existingMeeting?.status !== null),
      };
    });

    // Separate events with and without meeting URLs
    const eventsWithMeetings = enrichedEvents.filter((e) => e.meeting_url);
    const eventsWithoutMeetings = enrichedEvents.filter((e) => !e.meeting_url);

    return NextResponse.json({
      events: enrichedEvents,
      eventsWithMeetings,
      eventsWithoutMeetings,
      connected: true,
      totalEvents: calendarEvents.length,
      eventsWithMeetingUrls: eventsWithMeetings.length,
    });
  } catch (error) {
    console.error("[calendar-events] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch calendar events",
        details: error instanceof Error ? error.message : "Unknown error",
        events: [],
        connected: false,
      },
      { status: 500 }
    );
  }
}
