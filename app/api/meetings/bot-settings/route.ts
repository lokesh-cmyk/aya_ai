import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { RecordingMode } from "@/app/generated/prisma/enums";

const botSettingsSchema = z.object({
  botName: z.string().min(1).max(50).optional(),
  botImage: z.string().url().nullable().optional(),
  entryMessage: z.string().max(200).nullable().optional(),
  recordingMode: z.nativeEnum(RecordingMode).optional(),
  autoJoinEnabled: z.boolean().optional(),
});

// Get current user's bot settings
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let settings = await prisma.meetingBotSettings.findUnique({
      where: { userId: session.user.id },
    });

    // Return default settings if none exist
    if (!settings) {
      settings = {
        id: "",
        userId: session.user.id,
        botName: "AYA Meeting Assistant",
        botImage: null,
        entryMessage: null,
        recordingMode: RecordingMode.SPEAKER_VIEW,
        autoJoinEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Get bot settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bot settings" },
      { status: 500 }
    );
  }
}

// Create or update bot settings
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = botSettingsSchema.parse(body);

    const settings = await prisma.meetingBotSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        botName: validated.botName || "AYA Meeting Assistant",
        botImage: validated.botImage,
        entryMessage: validated.entryMessage,
        recordingMode: validated.recordingMode || RecordingMode.SPEAKER_VIEW,
        autoJoinEnabled: validated.autoJoinEnabled ?? true,
      },
      update: {
        ...(validated.botName !== undefined && { botName: validated.botName }),
        ...(validated.botImage !== undefined && { botImage: validated.botImage }),
        ...(validated.entryMessage !== undefined && {
          entryMessage: validated.entryMessage,
        }),
        ...(validated.recordingMode !== undefined && {
          recordingMode: validated.recordingMode,
        }),
        ...(validated.autoJoinEnabled !== undefined && {
          autoJoinEnabled: validated.autoJoinEnabled,
        }),
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Update bot settings error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update bot settings" },
      { status: 500 }
    );
  }
}
