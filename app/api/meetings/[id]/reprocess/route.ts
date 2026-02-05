import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MeetingStatus } from "@/app/generated/prisma/enums";
import { inngest } from "@/lib/inngest/client";
import { getMeetingBaasClient } from "@/lib/meetingbaas";

/**
 * Force re-process a meeting's transcript and insights
 * This is useful when:
 * - Processing failed silently
 * - Meeting is stuck in PROCESSING status
 * - Webhook was never received
 * - URLs have expired and need refreshing
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

    // Get meeting with metadata
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { transcript: true },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (meeting.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let transcriptUrl: string | undefined;
    let diarizationUrl: string | undefined;
    let audioUrl: string | undefined;

    // If we have a botId, fetch FRESH URLs from MeetingBaas (old URLs may have expired)
    if (meeting.botId) {
      console.log(`[reprocess] Fetching fresh URLs from MeetingBaas for bot ${meeting.botId}`);
      try {
        const client = getMeetingBaasClient();
        const botResponse = await client.getBot(meeting.botId);

        if (botResponse.success && botResponse.data) {
          const bot = botResponse.data;
          console.log(`[reprocess] Bot status: ${bot.status}`);

          // Get fresh URLs from bot data
          audioUrl = bot.audio || undefined;
          diarizationUrl = bot.diarization || undefined;
          transcriptUrl = bot.transcription || bot.transcript_url || undefined;

          // Also update metadata with fresh URLs
          const updatedMetadata = {
            ...(meeting.metadata as object || {}),
            audio_url: audioUrl,
            diarization_url: diarizationUrl,
            transcription_url: transcriptUrl,
            video_url: bot.video || bot.mp4,
          };

          await prisma.meeting.update({
            where: { id: meetingId },
            data: { metadata: updatedMetadata },
          });

          console.log(`[reprocess] Fresh URLs obtained - Audio: ${audioUrl ? 'yes' : 'no'}, Diarization: ${diarizationUrl ? 'yes' : 'no'}`);
        }
      } catch (error) {
        console.warn(`[reprocess] Could not fetch fresh URLs from MeetingBaas:`, error);
        // Fall back to metadata URLs
      }
    }

    // Fall back to metadata URLs if MeetingBaas fetch failed or no botId
    if (!audioUrl && !diarizationUrl && !transcriptUrl) {
      const metadata = (meeting.metadata as {
        transcription_url?: string;
        diarization_url?: string;
        audio_url?: string;
        video_url?: string;
        mp4_url?: string;
      }) || {};

      transcriptUrl = metadata.transcription_url;
      diarizationUrl = metadata.diarization_url;
      audioUrl = metadata.audio_url || meeting.recordingUrl || undefined;
    }

    // Check if we have any source to process from
    if (!transcriptUrl && !diarizationUrl && !audioUrl) {
      return NextResponse.json(
        {
          error: "No audio, diarization, or transcript URL available for this meeting",
          hint: "The meeting may not have completed recording yet, or the bot failed to capture audio",
          metadata: {
            hasTranscriptUrl: !!transcriptUrl,
            hasDiarizationUrl: !!diarizationUrl,
            hasAudioUrl: !!audioUrl,
            hasRecordingUrl: !!meeting.recordingUrl,
          },
        },
        { status: 400 }
      );
    }

    // Delete existing transcript and insights for fresh re-processing
    if (meeting.transcript) {
      await prisma.meetingTranscript.delete({
        where: { meetingId },
      });
    }

    await prisma.meetingInsight.deleteMany({
      where: { meetingId },
    });

    // Update status to PROCESSING
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.PROCESSING },
    });

    console.log(`[reprocess] Triggering reprocess for meeting ${meetingId}`);
    console.log(`[reprocess] Transcript URL: ${transcriptUrl || 'none'}`);
    console.log(`[reprocess] Diarization URL: ${diarizationUrl || 'none'}`);
    console.log(`[reprocess] Audio URL: ${audioUrl ? 'available' : 'none'}`);

    // Pre-flight check: Verify at least one URL is accessible
    let verifiedDiarizationUrl = diarizationUrl;
    let verifiedAudioUrl = audioUrl;
    let verifiedTranscriptUrl = transcriptUrl;

    // Test diarization URL first (preferred source)
    if (diarizationUrl) {
      try {
        console.log(`[reprocess] Testing diarization URL...`);
        const testResponse = await fetch(diarizationUrl, { method: 'HEAD' });
        if (testResponse.ok) {
          console.log(`[reprocess] Diarization URL is VALID`);
        } else {
          console.warn(`[reprocess] Diarization URL returned ${testResponse.status} - may be expired`);
          verifiedDiarizationUrl = undefined;
        }
      } catch (e) {
        console.warn(`[reprocess] Diarization URL test failed:`, e);
        verifiedDiarizationUrl = undefined;
      }
    }

    // Test audio URL if diarization failed
    if (!verifiedDiarizationUrl && audioUrl) {
      try {
        console.log(`[reprocess] Testing audio URL...`);
        const testResponse = await fetch(audioUrl, { method: 'HEAD' });
        if (testResponse.ok) {
          console.log(`[reprocess] Audio URL is VALID`);
        } else {
          console.warn(`[reprocess] Audio URL returned ${testResponse.status} - may be expired`);
          verifiedAudioUrl = undefined;
        }
      } catch (e) {
        console.warn(`[reprocess] Audio URL test failed:`, e);
        verifiedAudioUrl = undefined;
      }
    }

    // If all URLs are invalid, return error with helpful message
    if (!verifiedDiarizationUrl && !verifiedAudioUrl && !verifiedTranscriptUrl) {
      return NextResponse.json(
        {
          error: "All artifact URLs appear to be expired or invalid",
          hint: "MeetingBaas URLs expire after 4 hours. Try refreshing the meeting status from MeetingBaas first, or the meeting artifacts may no longer be available.",
          testedUrls: {
            diarization: diarizationUrl ? "expired/invalid" : "not available",
            audio: audioUrl ? "expired/invalid" : "not available",
            transcript: transcriptUrl ? "not tested" : "not available",
          },
        },
        { status: 400 }
      );
    }

    // Trigger the meeting completion processing with verified URLs
    await inngest.send({
      name: "meeting/complete",
      data: {
        meetingId,
        botId: meeting.botId,
        transcriptUrl: verifiedTranscriptUrl || null,
        diarizationUrl: verifiedDiarizationUrl || null,
        audioUrl: verifiedAudioUrl || null,
        recordingUrl: meeting.recordingUrl,
        duration: meeting.duration || 0,
      },
    });

    console.log(`[reprocess] Inngest event sent with verified URLs`);
    console.log(`[reprocess]   - diarization: ${verifiedDiarizationUrl ? 'yes' : 'no'}`);
    console.log(`[reprocess]   - audio: ${verifiedAudioUrl ? 'yes' : 'no'}`);
    console.log(`[reprocess]   - transcript: ${verifiedTranscriptUrl ? 'yes' : 'no'}`);

    return NextResponse.json({
      success: true,
      message: "Meeting reprocessing started",
      details: {
        meetingId,
        sources: {
          diarization: verifiedDiarizationUrl ? "valid" : (diarizationUrl ? "expired" : "not available"),
          audio: verifiedAudioUrl ? "valid" : (audioUrl ? "expired" : "not available"),
          transcript: verifiedTranscriptUrl ? "available" : "not available",
        },
        willUse: verifiedDiarizationUrl ? "diarization (has speaker names)" : (verifiedAudioUrl ? "audio (Whisper transcription)" : "transcript URL"),
      },
    });
  } catch (error) {
    console.error("[reprocess] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reprocess meeting" },
      { status: 500 }
    );
  }
}
