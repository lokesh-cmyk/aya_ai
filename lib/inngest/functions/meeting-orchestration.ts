import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { getMeetingBaasClient } from "@/lib/meetingbaas";
import { getComposio, COMPOSIO_APPS } from "@/lib/composio-tools";
import { notifyMeetingInsightsReady } from "@/lib/notifications";

import OpenAI from "openai";
import { MeetingPlatform, MeetingStatus, RecordingMode } from "@/app/generated/prisma/enums";

// Calendar event interface from Google Calendar
interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
    }>;
  };
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
  ];

  for (const pattern of urlPatterns) {
    const match = description.match(pattern);
    if (match) return match[0];
  }

  return null;
}

/**
 * Sync calendar meetings and schedule bots
 * Runs every 5 minutes to check for upcoming meetings
 */
export const syncCalendarMeetings = inngest.createFunction(
  { id: "sync-calendar-meetings" },
  { cron: "*/5 * * * *" }, // Every 5 minutes
  async ({ step }) => {
    console.log("[meeting-sync] Starting calendar meeting sync");

    // Get all users with meeting bot settings enabled
    const botSettings = await step.run("get-active-bot-settings", async () => {
      return await prisma.meetingBotSettings.findMany({
        where: { autoJoinEnabled: true },
      });
    });

    if (botSettings.length === 0) {
      console.log("[meeting-sync] No users with auto-join enabled");
      return { processed: 0 };
    }

    console.log(`[meeting-sync] Found ${botSettings.length} users with auto-join enabled`);

    let scheduledCount = 0;

    for (const settings of botSettings) {
      try {
        // Trigger individual user sync
        await step.run(`sync-user-${settings.userId}`, async () => {
          await inngest.send({
            name: "meeting/sync.user",
            data: {
              userId: settings.userId,
              botSettingsId: settings.id,
            },
          });
        });
        scheduledCount++;
      } catch (error) {
        console.error(`[meeting-sync] Error scheduling sync for user ${settings.userId}:`, error);
      }
    }

    return { scheduled: scheduledCount };
  }
);

/**
 * Sync meetings for a specific user
 */
export const syncUserMeetings = inngest.createFunction(
  { id: "sync-user-meetings" },
  { event: "meeting/sync.user" },
  async ({ event, step }) => {
    const { userId, botSettingsId } = event.data;

    console.log(`[meeting-sync-user] Syncing meetings for user ${userId}`);

    // Check if user has Google Calendar connected via Composio
    const calendarConnection = await step.run("get-composio-calendar", async () => {
      const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
      if (!apiKey) {
        console.log(`[meeting-sync-user] Composio API key not configured`);
        return null;
      }

      try {
        const composio = getComposio();
        const connectedAccounts = await composio.connectedAccounts.list({
          userIds: [userId],
          statuses: ["ACTIVE"],
          toolkitSlugs: [COMPOSIO_APPS.googlecalendar.slug],
        });

        const items = (connectedAccounts as { items?: Array<{ id: string; toolkit?: { slug?: string } }> }).items ?? [];
        return items.find(
          (i) => (i.toolkit?.slug ?? "").toLowerCase() === COMPOSIO_APPS.googlecalendar.slug.toLowerCase()
        ) || null;
      } catch (error) {
        console.error(`[meeting-sync-user] Error checking Composio connection:`, error);
        return null;
      }
    });

    if (!calendarConnection) {
      console.log(`[meeting-sync-user] No Composio Google Calendar connection for user ${userId}`);
      return { synced: 0 };
    }

    // Get bot settings
    const botSettings = await step.run("get-bot-settings", async () => {
      return await prisma.meetingBotSettings.findUnique({
        where: { id: botSettingsId },
      });
    });

    if (!botSettings) {
      return { synced: 0 };
    }

    // Fetch upcoming events from Composio (next 24 hours)
    const events = await step.run("fetch-calendar-events", async () => {
      try {
        const composio = getComposio();
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const result = await composio.tools.execute("GOOGLECALENDAR_FIND_EVENT", {
          userId: userId,
          connectedAccountId: calendarConnection.id,
          arguments: {
            calendar_id: "primary",
            timeMin: now.toISOString(),
            timeMax: tomorrow.toISOString(),
            max_results: 50,
            single_events: true,
            order_by: "startTime",
          },
          dangerouslySkipVersionCheck: true,
        });

        const data = result as {
          data?: { items?: GoogleCalendarEvent[] };
          items?: GoogleCalendarEvent[];
          response_data?: { items?: GoogleCalendarEvent[] };
          successful?: boolean;
          error?: string;
        };

        if (data.error) {
          console.error(`[meeting-sync-user] Composio error:`, data.error);
          return [];
        }

        return data.data?.items || data.items || data.response_data?.items || [];
      } catch (error) {
        console.error(`[meeting-sync-user] Error fetching calendar events:`, error);
        return [];
      }
    });

    console.log(`[meeting-sync-user] Found ${events.length} upcoming events`);

    let scheduledCount = 0;

    for (const event of events) {
      // Extract meeting URL from the event
      const meetingUrl = extractMeetingUrl(event);

      // Skip events without meeting URLs
      if (!meetingUrl) continue;

      const eventId = event.id;
      const startTime = event.start.dateTime || event.start.date || "";
      const endTime = event.end.dateTime || event.end.date || "";

      // Check if we already have this meeting scheduled
      const existingMeeting = await step.run(`check-existing-${eventId}`, async () => {
        return await prisma.meeting.findFirst({
          where: {
            userId,
            calendarEventId: eventId,
          },
          select: {
            id: true,
            botExcluded: true,
            status: true,
          },
        });
      });

      if (existingMeeting) {
        // If meeting exists and is excluded, skip scheduling bot
        if (existingMeeting.botExcluded) {
          console.log(`[meeting-sync-user] Meeting excluded from bot: ${eventId}`);
          continue;
        }
        console.log(`[meeting-sync-user] Meeting already scheduled: ${eventId}`);
        continue;
      }

      // Detect platform from meeting URL
      const platform = detectMeetingPlatform(meetingUrl);

      // Create meeting record
      const meeting = await step.run(`create-meeting-${eventId}`, async () => {
        return await prisma.meeting.create({
          data: {
            title: event.summary || "Untitled Meeting",
            meetingUrl: meetingUrl,
            platform,
            status: MeetingStatus.SCHEDULED,
            scheduledStart: new Date(startTime),
            scheduledEnd: endTime ? new Date(endTime) : null,
            calendarEventId: eventId,
            userId,
          },
        });
      });

      // Schedule bot to join the meeting
      await step.run(`schedule-bot-${eventId}`, async () => {
        await inngest.send({
          name: "meeting/schedule.bot",
          data: {
            meetingId: meeting.id,
            userId,
            botSettingsId,
          },
        });
      });

      scheduledCount++;
    }

    return { synced: scheduledCount };
  }
);

/**
 * Schedule a bot to join a meeting
 */
export const scheduleMeetingBot = inngest.createFunction(
  { id: "schedule-meeting-bot" },
  { event: "meeting/schedule.bot" },
  async ({ event, step }) => {
    const { meetingId, userId, botSettingsId } = event.data;

    console.log(`[schedule-bot] Scheduling bot for meeting ${meetingId}`);

    // Get meeting details
    const meeting = await step.run("get-meeting", async () => {
      return await prisma.meeting.findUnique({
        where: { id: meetingId },
      });
    });

    if (!meeting) {
      throw new Error(`Meeting ${meetingId} not found`);
    }

    // Check if meeting is excluded from bot
    if (meeting.botExcluded) {
      console.log(`[schedule-bot] Meeting ${meetingId} is excluded from bot - skipping`);
      return { success: false, meetingId, reason: "excluded" };
    }

    // Get bot settings
    const botSettings = await step.run("get-bot-settings", async () => {
      return await prisma.meetingBotSettings.findUnique({
        where: { id: botSettingsId },
      });
    });

    if (!botSettings) {
      throw new Error(`Bot settings ${botSettingsId} not found`);
    }

    // Calculate delay until meeting starts (join 1 minute before)
    const scheduledStartDate = new Date(meeting.scheduledStart);
    const joinTime = new Date(scheduledStartDate.getTime() - 60 * 1000);
    const now = new Date();

    if (joinTime <= now) {
      // Meeting is starting soon or already started, deploy bot immediately
      await step.run("deploy-bot-now", async () => {
        try {
          const client = getMeetingBaasClient();
          const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/meetingbaas`;

          const response = await client.deployBot({
            meeting_url: meeting.meetingUrl,
            bot_name: botSettings.botName,
            bot_image: botSettings.botImage || undefined,
            entry_message: botSettings.entryMessage || undefined,
            recording_mode: mapRecordingMode(botSettings.recordingMode),
            webhook_url: webhookUrl,
            speech_to_text: { provider: "Default" },
            automatic_leave: {
              waiting_room_timeout: 600, // 10 minutes
            },
          });

          if (response.success && response.data?.bot_id) {
            await prisma.meeting.update({
              where: { id: meetingId },
              data: {
                botId: response.data.bot_id,
                status: MeetingStatus.JOINING,
              },
            });
          } else {
            console.error(`[schedule-bot] Bot deployment failed:`, response.error);
            await prisma.meeting.update({
              where: { id: meetingId },
              data: {
                status: MeetingStatus.FAILED,
                errorMessage: response.error || "Failed to deploy bot",
              },
            });
          }
        } catch (error) {
          console.error(`[schedule-bot] Bot deployment error:`, error);
          await prisma.meeting.update({
            where: { id: meetingId },
            data: {
              status: MeetingStatus.FAILED,
              errorMessage: error instanceof Error ? error.message : "Bot deployment failed",
            },
          });
        }
      });
    } else {
      // Schedule bot deployment using Inngest's sleep
      const sleepMs = joinTime.getTime() - now.getTime();
      console.log(`[schedule-bot] Sleeping for ${sleepMs}ms until meeting starts`);

      await step.sleep("wait-for-meeting", sleepMs);

      // Re-check if meeting is still not excluded (user might have toggled during sleep)
      const currentMeeting = await step.run("recheck-meeting-status", async () => {
        return await prisma.meeting.findUnique({
          where: { id: meetingId },
          select: { botExcluded: true, status: true },
        });
      });

      if (currentMeeting?.botExcluded) {
        console.log(`[schedule-bot] Meeting ${meetingId} was excluded during wait - skipping`);
        return { success: false, meetingId, reason: "excluded_during_wait" };
      }

      await step.run("deploy-bot-scheduled", async () => {
        try {
          const client = getMeetingBaasClient();
          const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/meetingbaas`;

          const response = await client.deployBot({
            meeting_url: meeting.meetingUrl,
            bot_name: botSettings.botName,
            bot_image: botSettings.botImage || undefined,
            entry_message: botSettings.entryMessage || undefined,
            recording_mode: mapRecordingMode(botSettings.recordingMode),
            webhook_url: webhookUrl,
            speech_to_text: { provider: "Default" },
            automatic_leave: {
              waiting_room_timeout: 600,
            },
          });

          if (response.success && response.data?.bot_id) {
            await prisma.meeting.update({
              where: { id: meetingId },
              data: {
                botId: response.data.bot_id,
                status: MeetingStatus.JOINING,
              },
            });
          } else {
            console.error(`[schedule-bot] Bot deployment failed:`, response.error);
            await prisma.meeting.update({
              where: { id: meetingId },
              data: {
                status: MeetingStatus.FAILED,
                errorMessage: response.error || "Failed to deploy bot",
              },
            });
          }
        } catch (error) {
          console.error(`[schedule-bot] Bot deployment error:`, error);
          await prisma.meeting.update({
            where: { id: meetingId },
            data: {
              status: MeetingStatus.FAILED,
              errorMessage: error instanceof Error ? error.message : "Bot deployment failed",
            },
          });
        }
      });
    }

    return { success: true, meetingId };
  }
);

/**
 * Process completed meeting - fetch transcript and generate insights
 */
export const processMeetingComplete = inngest.createFunction(
  { id: "process-meeting-complete" },
  { event: "meeting/complete" },
  async ({ event, step }) => {
    const {
      meetingId,
      transcriptUrl,
      diarizationUrl,
      audioUrl,
      recordingUrl,
      duration,
    } = event.data;

    console.log(`[meeting-complete] Processing meeting ${meetingId}`);
    console.log(`[meeting-complete] Transcript URL: ${transcriptUrl || 'none'}`);
    console.log(`[meeting-complete] Diarization URL: ${diarizationUrl || 'none'}`);
    console.log(`[meeting-complete] Audio URL: ${audioUrl ? 'available' : 'none'}`);

    // Get meeting with metadata to access artifact URLs
    const meeting = await step.run("get-meeting-data", async () => {
      return await prisma.meeting.findUnique({
        where: { id: meetingId },
      });
    });

    if (!meeting) {
      throw new Error(`Meeting ${meetingId} not found`);
    }

    const metadata = (meeting.metadata as {
      transcription_url?: string;
      diarization_url?: string;
      audio_url?: string;
      video_url?: string;
      participants?: Array<{ name?: string; id?: number }>;
      speakers?: Array<{ name?: string; id?: number }>;
    }) || {};

    // Resolve all possible URLs
    const finalTranscriptUrl = transcriptUrl || metadata.transcription_url;
    const finalDiarizationUrl = diarizationUrl || metadata.diarization_url;
    const finalAudioUrl = audioUrl || metadata.audio_url || recordingUrl;

    console.log(`[meeting-complete] Final URLs - Transcript: ${finalTranscriptUrl || 'none'}, Diarization: ${finalDiarizationUrl || 'none'}, Audio: ${finalAudioUrl ? 'available' : 'none'}`);

    // Get or create transcript using diarization AND/OR audio transcription
    const transcript = await step.run("fetch-or-create-transcript", async () => {
      const { getTranscript } = await import("@/lib/transcription");

      // Try to get transcript from various sources
      // Priority: 1. Audio (Whisper for full accurate text) + Diarization (speaker info)
      //           2. Existing transcription
      //           3. Diarization only
      const result = await getTranscript(
        finalTranscriptUrl,
        finalDiarizationUrl,
        finalAudioUrl
      );

      if (!result) {
        throw new Error("Could not get transcript from any source - no audio, diarization, or transcript URL available");
      }

      console.log(`[meeting-complete] Transcript obtained: ${result.full_text.length} chars, ${result.segments.length} segments`);
      return result;
    });

    // Store transcript
    await step.run("store-transcript", async () => {
      // Calculate word count
      const wordCount = transcript.full_text.split(/\s+/).length;

      // Upsert to handle retries
      await prisma.meetingTranscript.upsert({
        where: { meetingId },
        create: {
          meetingId,
          fullText: transcript.full_text,
          segments: transcript.segments,
          language: transcript.language || "en",
          wordCount,
        },
        update: {
          fullText: transcript.full_text,
          segments: transcript.segments,
          language: transcript.language || "en",
          wordCount,
          updatedAt: new Date(),
        },
      });
    });

    // Save participants from MeetingBaas response AND transcript speakers
    await step.run("save-participants", async () => {
      const participantNames = new Set<string>();

      // Add participants from MeetingBaas metadata
      if (metadata.participants) {
        for (const p of metadata.participants) {
          if (p.name && !p.name.includes("Meeting Assistant")) {
            participantNames.add(p.name);
          }
        }
      }

      // Add speakers from MeetingBaas metadata
      if (metadata.speakers) {
        for (const s of metadata.speakers) {
          if (s.name) {
            participantNames.add(s.name);
          }
        }
      }

      // Add speakers from transcript segments
      for (const segment of transcript.segments) {
        if (segment.speaker && segment.speaker !== "Speaker" && segment.speaker !== "Unknown") {
          participantNames.add(segment.speaker);
        }
      }

      console.log(`[meeting-complete] Found ${participantNames.size} participants:`, Array.from(participantNames));

      if (participantNames.size > 0) {
        // Delete existing participants first (for retries)
        await prisma.meetingParticipant.deleteMany({
          where: { meetingId },
        });

        // Create new participants
        await prisma.meetingParticipant.createMany({
          data: Array.from(participantNames).map((name) => ({
            meetingId,
            name,
          })),
        });
      }
    });

    // Update meeting duration if not set
    await step.run("update-meeting-duration", async () => {
      if (!meeting.duration && (duration || transcript.duration)) {
        await prisma.meeting.update({
          where: { id: meetingId },
          data: {
            duration: duration || Math.round(transcript.duration),
          },
        });
      }
    });

    // Generate AI insights
    await step.run("trigger-insight-generation", async () => {
      await inngest.send({
        name: "meeting/generate.insights",
        data: {
          meetingId,
          transcriptText: transcript.full_text,
        },
      });
    });

    return { success: true, meetingId };
  }
);

/**
 * Generate AI insights from meeting transcript
 */
export const generateMeetingInsights = inngest.createFunction(
  { id: "generate-meeting-insights" },
  { event: "meeting/generate.insights" },
  async ({ event, step }) => {
    const { meetingId, transcriptText: eventTranscriptText } = event.data;

    console.log(`[meeting-insights] Generating insights for meeting ${meetingId}`);
    console.log(`[meeting-insights] Event transcript length: ${eventTranscriptText?.length || 0} chars`);

    // Get meeting details for context (including transcript from DB as fallback)
    const meeting = await step.run("get-meeting", async () => {
      return await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { participants: true, transcript: true },
      });
    });

    if (!meeting) {
      throw new Error(`Meeting ${meetingId} not found`);
    }

    // Use event transcript or fall back to database transcript
    const transcriptText = eventTranscriptText || meeting.transcript?.fullText;
    console.log(`[meeting-insights] Final transcript length: ${transcriptText?.length || 0} chars`);

    if (!transcriptText || transcriptText.trim().length === 0) {
      throw new Error(`No transcript text available for meeting ${meetingId}`);
    }

    // Generate insights using OpenAI GPT-4
    const insights = await step.run("call-openai", async () => {
      // Check for API key
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY environment variable is not set - cannot generate insights");
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const systemPrompt = `You are an expert meeting analyst. Analyze the following meeting transcript and provide structured insights.

Meeting: ${meeting.title}
Date: ${new Date(meeting.scheduledStart).toISOString()}
Duration: ${meeting.duration ? Math.round(meeting.duration / 60) : "Unknown"} minutes
Participants: ${meeting.participants.map((p) => p.name).join(", ")}

IMPORTANT: Respond with ONLY a valid JSON object, no markdown formatting, no code blocks, no additional text. Start your response with { and end with }.

Required JSON structure:
{
  "summary": "A 2-3 paragraph executive summary of the meeting",
  "key_topics": ["Topic 1", "Topic 2", "Topic 3"],
  "action_items": [
    {"task": "Description of task", "owner": "Person name or 'Unassigned'", "deadline": "mentioned deadline or null"}
  ],
  "decisions": ["Decision 1", "Decision 2"],
  "follow_up_questions": ["Question 1", "Question 2"],
  "sentiment": "positive|neutral|negative",
  "participation_summary": "Brief note on who contributed most and meeting dynamics"
}

If there are no items for a category (e.g., no action items), use an empty array [].`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Please analyze this meeting transcript:\n\n${transcriptText.substring(0, 100000)}`,
          },
        ],
      });

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("No response from OpenAI");
      }

      console.log(`[meeting-insights] OpenAI response length: ${responseText.length} chars`);

      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[meeting-insights] JSON parse error. Response: ${responseText.substring(0, 500)}`);
        throw new Error(`Could not parse JSON from OpenAI response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
      }
    });

    // Store insights in database
    await step.run("store-insights", async () => {
      const insightRecords = [
        {
          meetingId,
          type: "summary",
          content: insights.summary,
          confidence: 0.9,
        },
        {
          meetingId,
          type: "key_topics",
          content: JSON.stringify(insights.key_topics),
          confidence: 0.85,
        },
        {
          meetingId,
          type: "action_items",
          content: JSON.stringify(insights.action_items),
          confidence: 0.85,
        },
        {
          meetingId,
          type: "decisions",
          content: JSON.stringify(insights.decisions),
          confidence: 0.8,
        },
        {
          meetingId,
          type: "follow_up_questions",
          content: JSON.stringify(insights.follow_up_questions),
          confidence: 0.75,
        },
        {
          meetingId,
          type: "sentiment",
          content: insights.sentiment,
          confidence: 0.7,
        },
        {
          meetingId,
          type: "participation_summary",
          content: insights.participation_summary,
          confidence: 0.8,
        },
      ];

      await prisma.meetingInsight.createMany({
        data: insightRecords,
      });
    });

    // Update meeting status to completed
    await step.run("update-meeting-status", async () => {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { status: MeetingStatus.COMPLETED },
      });
    });

    // Send notification to meeting creator that insights are ready
    await step.run("notify-insights-ready", async () => {
      if (meeting.userId) {
        try {
          // Count the insights generated
          const insightCount = 7; // We generate 7 types of insights
          await notifyMeetingInsightsReady({
            userId: meeting.userId,
            meetingTitle: meeting.title,
            meetingId: meeting.id,
            insightCount,
          });
        } catch (notifyError) {
          console.warn("[meeting-insights] Notification failed:", notifyError);
        }
      }
    });

    console.log(`[meeting-insights] Insights generated for meeting ${meetingId}`);

    return { success: true, meetingId };
  }
);

/**
 * Handle transcription ready event (for async transcription)
 */
export const handleTranscriptionReady = inngest.createFunction(
  { id: "handle-transcription-ready" },
  { event: "meeting/transcription.ready" },
  async ({ event, step }) => {
    const { meetingId, transcriptUrl } = event.data;

    console.log(`[transcription-ready] New transcription for meeting ${meetingId}`);

    // Fetch and update transcript
    const transcript = await step.run("fetch-transcript", async () => {
      const client = getMeetingBaasClient();
      return await client.fetchTranscript(transcriptUrl);
    });

    // Update transcript
    await step.run("update-transcript", async () => {
      await prisma.meetingTranscript.upsert({
        where: { meetingId },
        create: {
          meetingId,
          fullText: transcript.full_text,
          segments: transcript.segments,
          language: transcript.language || "en",
          wordCount: transcript.full_text.split(/\s+/).length,
        },
        update: {
          fullText: transcript.full_text,
          segments: transcript.segments,
          language: transcript.language || "en",
          wordCount: transcript.full_text.split(/\s+/).length,
          updatedAt: new Date(),
        },
      });
    });

    // Regenerate insights
    await step.run("regenerate-insights", async () => {
      // Delete existing insights
      await prisma.meetingInsight.deleteMany({
        where: { meetingId },
      });

      // Trigger new insight generation
      await inngest.send({
        name: "meeting/generate.insights",
        data: {
          meetingId,
          transcriptText: transcript.full_text,
        },
      });
    });

    return { success: true, meetingId };
  }
);

// Helper functions

function detectMeetingPlatform(url: string): MeetingPlatform {
  if (url.includes("meet.google.com")) {
    return MeetingPlatform.GOOGLE_MEET;
  } else if (url.includes("zoom.us") || url.includes("zoom.com")) {
    return MeetingPlatform.ZOOM;
  } else if (url.includes("teams.microsoft.com") || url.includes("teams.live.com")) {
    return MeetingPlatform.MICROSOFT_TEAMS;
  }
  return MeetingPlatform.GOOGLE_MEET; // Default
}

function mapRecordingMode(mode: RecordingMode): "speaker_view" | "gallery_view" | "audio_only" {
  switch (mode) {
    case RecordingMode.SPEAKER_VIEW:
      return "speaker_view";
    case RecordingMode.GALLERY_VIEW:
      return "gallery_view";
    case RecordingMode.AUDIO_ONLY:
      return "audio_only";
    default:
      return "speaker_view";
  }
}

/**
 * Poll MeetingBaas for meetings stuck in JOINING/IN_PROGRESS status
 * This serves as a fallback when webhooks don't work (e.g., localhost development)
 * Runs every 2 minutes
 */
export const pollMeetingStatuses = inngest.createFunction(
  { id: "poll-meeting-statuses" },
  { cron: "*/2 * * * *" }, // Every 2 minutes
  async ({ step }) => {
    console.log("[poll-statuses] Checking for stuck meetings");

    // Find meetings that might need status updates
    const stuckMeetings = await step.run("find-stuck-meetings", async () => {
      return await prisma.meeting.findMany({
        where: {
          botId: { not: null },
          status: {
            in: [MeetingStatus.JOINING, MeetingStatus.IN_PROGRESS, MeetingStatus.PROCESSING],
          },
        },
        select: {
          id: true,
          botId: true,
          status: true,
          actualStart: true,
          scheduledStart: true,
        },
      });
    });

    if (stuckMeetings.length === 0) {
      console.log("[poll-statuses] No meetings to check");
      return { checked: 0 };
    }

    console.log(`[poll-statuses] Checking ${stuckMeetings.length} meetings`);

    let updatedCount = 0;
    let processedCount = 0;

    for (const meeting of stuckMeetings) {
      if (!meeting.botId) continue;

      try {
        const botStatus = await step.run(`check-bot-${meeting.id}`, async () => {
          const client = getMeetingBaasClient();
          const response = await client.getBot(meeting.botId!);
          return response.success ? (response.data as any)?.bot || response.data : null;
        });

        if (!botStatus) {
          console.log(`[poll-statuses] Could not fetch bot status for meeting ${meeting.id}`);
          continue;
        }

        type BotStatusKey = "queued" | "joining" | "in_waiting_room" | "in_call" | "recording" | "ended" | "failed" | "completed";

        const statusMap: Record<BotStatusKey, MeetingStatus> = {
          queued: MeetingStatus.SCHEDULED,
          joining: MeetingStatus.JOINING,
          in_waiting_room: MeetingStatus.JOINING,
          in_call: MeetingStatus.IN_PROGRESS,
          recording: MeetingStatus.IN_PROGRESS,
          ended: MeetingStatus.PROCESSING,
          failed: MeetingStatus.FAILED,
          completed: MeetingStatus.PROCESSING,
        };

        const newStatus = statusMap[botStatus.status as BotStatusKey];

        if (newStatus && newStatus !== meeting.status) {
          await step.run(`update-meeting-${meeting.id}`, async () => {
            const updateData: {
              status: MeetingStatus;
              actualStart?: Date;
              actualEnd?: Date;
              recordingUrl?: string;
            } = { status: newStatus };

            if ((botStatus.status === "in_call" || botStatus.status === "recording") && !meeting.actualStart) {
              updateData.actualStart = new Date();
            }

            if (botStatus.status === "ended" || botStatus.status === "completed") {
              updateData.actualEnd = new Date();
              if (botStatus.recording_url) {
                updateData.recordingUrl = botStatus.recording_url;
              }
            }

            await prisma.meeting.update({
              where: { id: meeting.id },
              data: updateData,
            });

            updatedCount++;
          });

          // If bot completed and has transcript, trigger processing
          if (
            (botStatus.status === "ended" || botStatus.status === "completed") &&
            botStatus.transcript_url
          ) {
            await step.run(`trigger-processing-${meeting.id}`, async () => {
              await inngest.send({
                name: "meeting/complete",
                data: {
                  meetingId: meeting.id,
                  botId: meeting.botId,
                  transcriptUrl: botStatus.transcript_url,
                  recordingUrl: botStatus.recording_url,
                  duration: 0,
                },
              });
              processedCount++;
            });
          }
        }
      } catch (error) {
        console.error(`[poll-statuses] Error checking meeting ${meeting.id}:`, error);
      }
    }

    console.log(`[poll-statuses] Updated ${updatedCount} meetings, triggered ${processedCount} for processing`);

    return { checked: stuckMeetings.length, updated: updatedCount, processed: processedCount };
  }
);
