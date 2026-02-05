import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { getMeetingBaasClient } from "@/lib/meetingbaas";
import { inngest } from "@/lib/inngest/client";

const connectCalendarSchema = z.object({
  platform: z.enum(["Google", "Outlook"]),
  oauth_client_id: z.string().min(1),
  oauth_client_secret: z.string().min(1),
  oauth_refresh_token: z.string().min(1),
  raw_calendar_id: z.string().optional(),
});

// Connect a calendar to MeetingBaas for automatic bot scheduling
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = connectCalendarSchema.parse(body);

    // Create calendar in MeetingBaas
    const client = getMeetingBaasClient();
    const response = await client.createCalendar({
      platform: validated.platform,
      oauth_client_id: validated.oauth_client_id,
      oauth_client_secret: validated.oauth_client_secret,
      oauth_refresh_token: validated.oauth_refresh_token,
      raw_calendar_id: validated.raw_calendar_id,
    });

    if (!response.success || !response.data) {
      return NextResponse.json(
        { error: response.error || "Failed to connect calendar" },
        { status: 400 }
      );
    }

    // Store integration - use findFirst + create/update since teamId can be null
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        name: "meetingbaas-calendar",
        type: "meetingbaas",
        userId: session.user.id,
      },
    });

    const integrationData = {
      isActive: true,
      config: {
        platform: validated.platform,
        calendar_uuid: response.data.calendar.uuid,
        calendar_name: response.data.calendar.name,
      },
    };

    const integration = existingIntegration
      ? await prisma.integration.update({
          where: { id: existingIntegration.id },
          data: integrationData,
        })
      : await prisma.integration.create({
          data: {
            name: "meetingbaas-calendar",
            type: "meetingbaas",
            userId: session.user.id,
            ...integrationData,
          },
        });

    // Also ensure bot settings exist
    const botSettings = await prisma.meetingBotSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        botName: "AYA Meeting Assistant",
        autoJoinEnabled: true,
      },
      update: {},
    });

    // Trigger immediate calendar sync to fetch upcoming meetings
    await inngest.send({
      name: "meeting/sync.user",
      data: {
        userId: session.user.id,
        botSettingsId: botSettings.id,
      },
    });

    return NextResponse.json({
      success: true,
      calendar: response.data.calendar,
      integrationId: integration.id,
      syncTriggered: true,
    });
  } catch (error) {
    console.error("Connect calendar error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to connect calendar" },
      { status: 500 }
    );
  }
}

// Get calendar connection status
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integration = await prisma.integration.findFirst({
      where: {
        name: "meetingbaas-calendar",
        type: "meetingbaas",
        userId: session.user.id,
      },
    });

    if (!integration) {
      return NextResponse.json({ connected: false });
    }

    const config = integration.config as {
      platform?: string;
      calendar_uuid?: string;
      calendar_name?: string;
    };

    return NextResponse.json({
      connected: integration.isActive,
      platform: config.platform,
      calendarName: config.calendar_name,
    });
  } catch (error) {
    console.error("Get calendar status error:", error);
    return NextResponse.json(
      { error: "Failed to get calendar status" },
      { status: 500 }
    );
  }
}

// Disconnect calendar
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.integration.updateMany({
      where: {
        name: "meetingbaas-calendar",
        type: "meetingbaas",
        userId: session.user.id,
      },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Disconnect calendar error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect calendar" },
      { status: 500 }
    );
  }
}
