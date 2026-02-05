import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MeetingStatus } from "@/app/generated/prisma/enums";
import crypto from "crypto";
import { notifyMeetingStarted, notifyMeetingEnded } from "@/lib/notifications";

/**
 * MeetingBaas v2 Webhook Types (SVIX-based)
 */
interface BotStatusChangeEvent {
  event: "bot.status_change";
  data: {
    bot_id: string;
    event_id?: string;
    status: string | {
      code: string;
      created_at: string;
      start_time?: number;
    };
    extra?: Record<string, unknown>;
  };
}

interface BotCompletedEvent {
  event: "bot.completed";
  data: {
    bot_id: string;
    event_id?: string;
    transcription?: string; // URL
    mp4?: string; // URL
    audio?: string; // URL
    diarization?: string; // URL
    duration_seconds?: number;
    participants?: Array<{ name?: string; email?: string }>;
    speakers?: Array<{ name: string; duration?: number }>;
    extra?: Record<string, unknown>;
  };
}

interface BotFailedEvent {
  event: "bot.failed";
  data: {
    bot_id: string;
    event_id?: string;
    error_code: string;
    error_message: string;
    extra?: Record<string, unknown>;
  };
}

type MeetingBaasV2WebhookEvent = BotStatusChangeEvent | BotCompletedEvent | BotFailedEvent;

/**
 * Verify SVIX webhook signature
 * SVIX uses: svix-id, svix-timestamp, svix-signature headers
 */
function verifySvixSignature(
  payload: string,
  headers: {
    svixId: string | null;
    svixTimestamp: string | null;
    svixSignature: string | null;
  },
  secret: string
): boolean {
  const { svixId, svixTimestamp, svixSignature } = headers;

  if (!svixId || !svixTimestamp || !svixSignature || !secret) {
    return false;
  }

  try {
    // SVIX signature format: v1,<base64-signature>
    const signatures = svixSignature.split(" ");

    // Decode the secret (SVIX secrets are base64 encoded with "whsec_" prefix)
    const secretBytes = Buffer.from(
      secret.startsWith("whsec_") ? secret.slice(6) : secret,
      "base64"
    );

    // Create the signed content: id.timestamp.payload
    const signedContent = `${svixId}.${svixTimestamp}.${payload}`;

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");

    // Check if any of the provided signatures match
    for (const sig of signatures) {
      const [version, signature] = sig.split(",");
      if (version === "v1" && signature === expectedSignature) {
        return true;
      }
    }

    // Also try without version prefix (for backwards compatibility)
    return signatures.some((sig) => sig === expectedSignature);
  } catch (error) {
    console.error("[webhook] Signature verification error:", error);
    return false;
  }
}

/**
 * Webhook handler for MeetingBaas v2 events (SVIX-based)
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Get SVIX headers
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    // Also support legacy headers as fallback
    const legacySignature = request.headers.get("x-webhook-signature") ||
                           request.headers.get("x-meetingbaas-signature") ||
                           request.headers.get("x-mb-secret");

    const webhookSecret = process.env.MEETINGBAAS_WEBHOOK_SECRET;

    console.log("[webhook] Received MeetingBaas webhook");
    console.log("[webhook] Headers:", {
      svixId,
      svixTimestamp,
      svixSignature: svixSignature ? "present" : "missing",
      legacySignature: legacySignature ? "present" : "missing",
    });

    // Verify SVIX signature if headers are present
    if (svixId && svixTimestamp && svixSignature && webhookSecret) {
      const isValid = verifySvixSignature(rawBody, { svixId, svixTimestamp, svixSignature }, webhookSecret);
      if (!isValid) {
        console.error("[webhook] Invalid SVIX signature");
        // Don't reject - log and continue for debugging
        // return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      } else {
        console.log("[webhook] SVIX signature verified");
      }
    }

    const body = JSON.parse(rawBody);
    console.log("[webhook] Event type:", body.event);
    console.log("[webhook] Payload:", JSON.stringify(body, null, 2));

    // Log the webhook for debugging
    await prisma.webhook.create({
      data: {
        source: "meetingbaas",
        payload: body as object,
        processed: false,
      },
    });

    // Handle v2 format (nested under data) and v1 format (flat)
    const event = body.event;
    const botId = body.data?.bot_id || body.bot_id;

    if (!botId) {
      console.log("[webhook] No bot_id found in payload");
      return NextResponse.json({ success: true, message: "No bot_id" });
    }

    // Find the meeting by bot ID
    const meeting = await prisma.meeting.findFirst({
      where: { botId },
    });

    if (!meeting) {
      console.log(`[webhook] No meeting found for bot ${botId}`);
      return NextResponse.json({ success: true, message: "Bot not tracked" });
    }

    console.log(`[webhook] Found meeting ${meeting.id} for bot ${botId}`);

    switch (event) {
      case "bot.completed": {
        const completedData = body.data as BotCompletedEvent["data"];

        console.log(`[webhook] Bot completed for meeting ${meeting.id}`);

        // Update meeting with recording details
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: {
            status: MeetingStatus.PROCESSING,
            actualEnd: new Date(),
            duration: completedData.duration_seconds,
            recordingUrl: completedData.mp4 || completedData.audio,
            metadata: {
              ...(meeting.metadata as object || {}),
              transcription_url: completedData.transcription,
              mp4_url: completedData.mp4,
              audio_url: completedData.audio,
              diarization_url: completedData.diarization,
              participants: completedData.participants,
              speakers: completedData.speakers,
            },
          },
        });

        // Send notification that meeting ended
        if (meeting.teamId) {
          try {
            await notifyMeetingEnded({
              teamId: meeting.teamId,
              meetingTitle: meeting.title,
              meetingId: meeting.id,
              duration: completedData.duration_seconds,
              hasRecording: !!(completedData.mp4 || completedData.audio),
              hasTranscript: !!completedData.transcription,
            });
          } catch (notifyError) {
            console.warn("[webhook] Meeting ended notification failed:", notifyError);
          }
        }

        // Trigger Inngest to process transcript and generate insights
        // Process if we have audio (for Whisper), diarization, or transcription
        if (completedData.audio || completedData.diarization || completedData.transcription) {
          const { inngest } = await import("@/lib/inngest/client");
          await inngest.send({
            name: "meeting/complete",
            data: {
              meetingId: meeting.id,
              botId,
              transcriptUrl: completedData.transcription || null,
              diarizationUrl: completedData.diarization || null,
              audioUrl: completedData.audio || null,
              recordingUrl: completedData.mp4 || completedData.audio,
              duration: completedData.duration_seconds || 0,
            },
          });
        }

        break;
      }

      case "bot.failed": {
        const failedData = body.data as BotFailedEvent["data"];

        console.log(`[webhook] Bot failed for meeting ${meeting.id}: ${failedData.error_code}`);

        await prisma.meeting.update({
          where: { id: meeting.id },
          data: {
            status: MeetingStatus.FAILED,
            errorMessage: `${failedData.error_code}: ${failedData.error_message}`,
          },
        });

        break;
      }

      case "bot.status_change": {
        const statusData = body.data as BotStatusChangeEvent["data"];
        // Handle both formats: status can be string or { code: string, ... }
        const statusCode = typeof statusData.status === 'string'
          ? statusData.status
          : statusData.status?.code || 'unknown';

        console.log(`[webhook] Bot status change for meeting ${meeting.id}: ${statusCode}`);

        // Map v2 bot status codes to meeting status
        const statusMap: Record<string, MeetingStatus> = {
          queued: MeetingStatus.SCHEDULED,
          joining: MeetingStatus.JOINING,
          in_waiting_room: MeetingStatus.JOINING,
          in_call_recording: MeetingStatus.IN_PROGRESS,
          in_call_not_recording: MeetingStatus.IN_PROGRESS,
          in_call: MeetingStatus.IN_PROGRESS,
          recording: MeetingStatus.IN_PROGRESS,
          transcribing: MeetingStatus.PROCESSING,
          completed: MeetingStatus.PROCESSING,
          failed: MeetingStatus.FAILED,
        };

        const newStatus = statusMap[statusCode];
        if (newStatus) {
          const updateData: {
            status: MeetingStatus;
            actualStart?: Date;
            actualEnd?: Date;
          } = { status: newStatus };

          // Set actual start time when bot starts recording
          const isStarting = statusCode === "in_call_recording" || statusCode === "in_call" || statusCode === "recording";
          if (isStarting) {
            if (!meeting.actualStart) {
              updateData.actualStart = new Date();
            }
          }

          // Set actual end time when transcribing/completed
          if (statusCode === "transcribing" || statusCode === "completed") {
            if (!meeting.actualEnd) {
              updateData.actualEnd = new Date();
            }
          }

          await prisma.meeting.update({
            where: { id: meeting.id },
            data: updateData,
          });

          // Send notification when meeting starts (first time entering recording state)
          if (isStarting && !meeting.actualStart && meeting.teamId) {
            try {
              await notifyMeetingStarted({
                teamId: meeting.teamId,
                meetingTitle: meeting.title,
                meetingId: meeting.id,
                meetingUrl: meeting.meetingUrl || undefined,
                startedById: meeting.userId || undefined,
              });
            } catch (notifyError) {
              console.warn("[webhook] Meeting started notification failed:", notifyError);
            }
          }
        }

        break;
      }

      // Handle legacy event names (v1 format)
      case "complete": {
        console.log(`[webhook] Legacy complete event for meeting ${meeting.id}`);

        const legacyData = body as {
          recording_url?: string;
          transcript_url?: string;
          duration?: number;
          participants?: number;
        };

        await prisma.meeting.update({
          where: { id: meeting.id },
          data: {
            status: MeetingStatus.PROCESSING,
            actualEnd: new Date(),
            duration: legacyData.duration,
            recordingUrl: legacyData.recording_url,
            metadata: {
              ...(meeting.metadata as object || {}),
              transcript_url: legacyData.transcript_url,
              participants_count: legacyData.participants,
            },
          },
        });

        // Send notification that meeting ended
        if (meeting.teamId) {
          try {
            await notifyMeetingEnded({
              teamId: meeting.teamId,
              meetingTitle: meeting.title,
              meetingId: meeting.id,
              duration: legacyData.duration,
              hasRecording: !!legacyData.recording_url,
              hasTranscript: !!legacyData.transcript_url,
            });
          } catch (notifyError) {
            console.warn("[webhook] Legacy meeting ended notification failed:", notifyError);
          }
        }

        if (legacyData.transcript_url) {
          const { inngest } = await import("@/lib/inngest/client");
          await inngest.send({
            name: "meeting/complete",
            data: {
              meetingId: meeting.id,
              botId,
              transcriptUrl: legacyData.transcript_url,
              recordingUrl: legacyData.recording_url,
              duration: legacyData.duration || 0,
            },
          });
        }

        break;
      }

      case "failed": {
        console.log(`[webhook] Legacy failed event for meeting ${meeting.id}`);

        const legacyData = body as { error_code?: string; error_message?: string };

        await prisma.meeting.update({
          where: { id: meeting.id },
          data: {
            status: MeetingStatus.FAILED,
            errorMessage: `${legacyData.error_code || "UNKNOWN"}: ${legacyData.error_message || "Unknown error"}`,
          },
        });

        break;
      }

      default:
        console.log(`[webhook] Unhandled event type: ${event}`);
    }

    // Mark webhook as processed
    await prisma.webhook.updateMany({
      where: {
        source: "meetingbaas",
        processed: false,
        payload: {
          path: ["data", "bot_id"],
          equals: botId,
        },
      },
      data: { processed: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[webhook] MeetingBaas webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "meetingbaas-webhook-v2",
    timestamp: new Date().toISOString(),
  });
}
