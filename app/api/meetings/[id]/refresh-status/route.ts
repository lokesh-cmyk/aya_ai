import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMeetingBaasClient } from "@/lib/meetingbaas";
import { MeetingStatus } from "@/app/generated/prisma/enums";
import { inngest } from "@/lib/inngest/client";

/**
 * Refresh meeting status by polling MeetingBaas API directly
 * This is a fallback when webhooks don't work (e.g., localhost development)
 */
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

    const { id: meetingId } = await params;

    // Check for force reprocess query param
    const { searchParams } = new URL(request.url);
    const forceReprocess = searchParams.get("force") === "true";

    // Get meeting
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (meeting.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!meeting.botId) {
      return NextResponse.json(
        { error: "No bot associated with this meeting" },
        { status: 400 }
      );
    }

    // Fetch bot status from MeetingBaas
    const client = getMeetingBaasClient();
    let bot: {
      bot_id?: string;
      status: string;
      video?: string;
      audio?: string;
      mp4?: string;
      recording_url?: string;
      transcript_url?: string;
      transcription?: string;
      diarization?: string;
      duration_seconds?: number;
      participants?: Array<{ name?: string; id?: number; profile_picture?: string }>;
      speakers?: Array<{ name?: string; id?: number; profile_picture?: string }>;
    };

    try {
      const botResponse = await client.getBot(meeting.botId);
      console.log(`[refresh-status] MeetingBaas response:`, JSON.stringify(botResponse, null, 2));

      // MeetingBaas v2 API returns: { success: true, data: { bot_id, status, video, audio, ... } }
      if (botResponse.success && botResponse.data) {
        // The data object IS the bot info (not data.bot)
        bot = botResponse.data as typeof bot;
      } else if ((botResponse as { status?: string }).status) {
        // Direct bot object
        bot = botResponse as unknown as typeof bot;
      } else {
        console.error(`[refresh-status] Unexpected response format:`, botResponse);
        return NextResponse.json(
          { error: "Unexpected response format from MeetingBaas", details: botResponse },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error(`[refresh-status] Error fetching bot:`, error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch bot status from MeetingBaas" },
        { status: 500 }
      );
    }

    if (!bot || !bot.status) {
      return NextResponse.json(
        { error: "Invalid bot data from MeetingBaas" },
        { status: 500 }
      );
    }
    console.log(`[refresh-status] Bot ${meeting.botId} status: ${bot.status}`);

    // Map bot status to meeting status
    // MeetingBaas may return various status formats
    const statusMap: Record<string, MeetingStatus> = {
      // Standard statuses
      queued: MeetingStatus.SCHEDULED,
      joining: MeetingStatus.JOINING,
      joining_call: MeetingStatus.JOINING,
      in_waiting_room: MeetingStatus.JOINING,
      waiting_room: MeetingStatus.JOINING,
      in_call: MeetingStatus.IN_PROGRESS,
      in_call_not_recording: MeetingStatus.IN_PROGRESS,
      in_call_recording: MeetingStatus.IN_PROGRESS,
      recording: MeetingStatus.IN_PROGRESS,
      call_ended: MeetingStatus.PROCESSING,
      ended: MeetingStatus.PROCESSING,
      recording_succeeded: MeetingStatus.PROCESSING,
      completed: MeetingStatus.PROCESSING,
      done: MeetingStatus.PROCESSING,
      failed: MeetingStatus.FAILED,
      error: MeetingStatus.FAILED,
    };

    // Normalize status to lowercase and replace spaces with underscores
    const normalizedStatus = bot.status.toLowerCase().replace(/\s+/g, '_');
    console.log(`[refresh-status] Normalized status: ${normalizedStatus}`);

    const newStatus = statusMap[normalizedStatus] || statusMap[bot.status] || meeting.status;
    const updateData: {
      status: MeetingStatus;
      actualStart?: Date;
      actualEnd?: Date;
      recordingUrl?: string;
      duration?: number;
      metadata?: any;
    } = { status: newStatus };

    // Set actual start time when bot is in call
    const inCallStatuses = ["in_call", "in_call_not_recording", "in_call_recording", "recording"];
    if (inCallStatuses.includes(normalizedStatus) && !meeting.actualStart) {
      updateData.actualStart = new Date();
    }

    // Set actual end time when bot has ended
    const completedStatuses = ["ended", "completed", "call_ended", "recording_succeeded", "done", "transcribing"];
    if (completedStatuses.includes(normalizedStatus)) {
      if (!meeting.actualEnd) {
        updateData.actualEnd = new Date();
      }
      // MeetingBaas v2 uses 'video' and 'audio' instead of 'recording_url' or 'mp4'
      const recordingUrl = bot.video || bot.mp4 || bot.recording_url || bot.audio;
      if (recordingUrl) {
        updateData.recordingUrl = recordingUrl;
      }
      // Store duration
      if (bot.duration_seconds) {
        updateData.duration = bot.duration_seconds;
      }
      // Store metadata about participants, speakers, and artifact URLs
      updateData.metadata = {
        ...(meeting.metadata as object || {}),
        video_url: bot.video,
        audio_url: bot.audio,
        transcription_url: bot.transcription || bot.transcript_url,
        diarization_url: bot.diarization,
        participants: bot.participants,
        speakers: bot.speakers,
      };
    }

    // Update meeting
    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: updateData,
    });

    // Save participants from MeetingBaas response
    if (bot.participants && bot.participants.length > 0) {
      const participantNames = new Set<string>();

      // Add participants (exclude bot)
      for (const p of bot.participants) {
        if (p.name && !p.name.includes("Meeting Assistant") && !p.name.includes("Bot")) {
          participantNames.add(p.name);
        }
      }

      // Add speakers
      if (bot.speakers) {
        for (const s of bot.speakers) {
          if (s.name) {
            participantNames.add(s.name);
          }
        }
      }

      if (participantNames.size > 0) {
        console.log(`[refresh-status] Saving ${participantNames.size} participants:`, Array.from(participantNames));

        // Delete existing participants and create new ones
        await prisma.meetingParticipant.deleteMany({
          where: { meetingId },
        });

        await prisma.meetingParticipant.createMany({
          data: Array.from(participantNames).map((name) => ({
            meetingId,
            name,
          })),
        });
      }
    }

    // Get URLs for transcript processing
    const transcriptUrl = bot.transcription || bot.transcript_url;
    const diarizationUrl = bot.diarization;
    const audioUrl = bot.audio;

    // If bot has completed and we have audio, diarization, or transcript - trigger processing
    // Audio is sufficient because we can transcribe it with Whisper
    // Also allow re-processing if:
    // - forceReprocess=true query param is passed
    // - stuck in PROCESSING status for more than 5 minutes
    const processingStuckThreshold = 5 * 60 * 1000; // 5 minutes
    const isStuckInProcessing = meeting.status === MeetingStatus.PROCESSING &&
      meeting.updatedAt &&
      (Date.now() - new Date(meeting.updatedAt).getTime()) > processingStuckThreshold;

    const shouldProcess = completedStatuses.includes(normalizedStatus) &&
      (transcriptUrl || diarizationUrl || audioUrl) &&
      (
        forceReprocess ||
        isStuckInProcessing ||
        (meeting.status !== MeetingStatus.COMPLETED && meeting.status !== MeetingStatus.PROCESSING)
      );

    if (shouldProcess) {
      console.log(`[refresh-status] Triggering meeting completion processing`);
      console.log(`[refresh-status] Transcript URL: ${transcriptUrl}`);
      console.log(`[refresh-status] Diarization URL: ${diarizationUrl}`);
      console.log(`[refresh-status] Audio URL: ${audioUrl ? 'available' : 'not available'}`);

      await inngest.send({
        name: "meeting/complete",
        data: {
          meetingId: meeting.id,
          botId: meeting.botId,
          transcriptUrl: transcriptUrl || null,
          diarizationUrl: diarizationUrl || null,
          audioUrl: audioUrl || null,
          recordingUrl: bot.video || bot.audio,
          duration: bot.duration_seconds || 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      previousStatus: meeting.status,
      newStatus: updatedMeeting.status,
      botStatus: bot.status,
      hasRecording: !!(bot.video || bot.audio || bot.recording_url),
      hasTranscript: !!(bot.transcription || bot.transcript_url),
      hasDiarization: !!bot.diarization,
      participantCount: bot.participants?.length || 0,
    });
  } catch (error) {
    console.error("[refresh-status] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh status" },
      { status: 500 }
    );
  }
}
