import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { sendText, toChatId } from "@/lib/integrations/waha";
import { formatMeetingWhatsAppSummary } from "@/lib/whatsapp/meeting-summary-formatter";

/**
 * Send meeting summary via WhatsApp, 15 minutes after insights are ready.
 *
 * Trigger: "meeting/insights.ready" event (emitted by generateMeetingInsights)
 * Flow: sleep 15 min → check eligibility → format message → send via WAHA
 */
export const sendMeetingWhatsAppSummary = inngest.createFunction(
  {
    id: "send-meeting-whatsapp-summary",
    retries: 3,
  },
  { event: "meeting/insights.ready" },
  async ({ event, step }) => {
    const { meetingId, userId } = event.data;

    console.log(
      `[wa-meeting-summary] Received insights.ready for meeting ${meetingId}, waiting 15 minutes`
    );

    // Wait 15 minutes before sending
    await step.sleep("wait-15-minutes", "15m");

    // Check eligibility: user has WhatsApp, feature enabled, not already sent
    const eligibility = await step.run("check-eligibility", async () => {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        select: {
          id: true,
          title: true,
          status: true,
          whatsappSummarySentAt: true,
          scheduledStart: true,
          duration: true,
          userId: true,
          user: {
            select: {
              id: true,
              whatsappPhone: true,
              whatsappMeetingSummaryEnabled: true,
              timezone: true,
            },
          },
        },
      });

      if (!meeting) {
        return { eligible: false, reason: "meeting_not_found" } as const;
      }

      if (meeting.whatsappSummarySentAt) {
        return { eligible: false, reason: "already_sent" } as const;
      }

      if (!meeting.user.whatsappPhone) {
        return { eligible: false, reason: "no_whatsapp_phone" } as const;
      }

      if (!meeting.user.whatsappMeetingSummaryEnabled) {
        return { eligible: false, reason: "feature_disabled" } as const;
      }

      return { eligible: true, meeting } as const;
    });

    if (!eligibility.eligible) {
      console.log(
        `[wa-meeting-summary] Skipping meeting ${meetingId}: ${eligibility.reason}`
      );
      return { sent: false, reason: eligibility.reason };
    }

    const { meeting } = eligibility;

    // Fetch insights and participants, then format the message
    const message = await step.run("fetch-and-format", async () => {
      // Fetch summary and action_items insights
      const insights = await prisma.meetingInsight.findMany({
        where: {
          meetingId,
          type: { in: ["summary", "action_items"] },
        },
      });

      const summaryInsight = insights.find((i) => i.type === "summary");
      const actionItemsInsight = insights.find(
        (i) => i.type === "action_items"
      );

      const summary = summaryInsight?.content || "No summary available.";

      let actionItems: Array<{
        task: string;
        owner: string;
        deadline?: string | null;
      }> = [];
      if (actionItemsInsight?.content) {
        try {
          actionItems = JSON.parse(actionItemsInsight.content);
        } catch {
          console.warn(
            `[wa-meeting-summary] Failed to parse action items for meeting ${meetingId}`
          );
        }
      }

      // Get participant count
      const participantCount = await prisma.meetingParticipant.count({
        where: { meetingId },
      });

      return formatMeetingWhatsAppSummary({
        title: meeting.title,
        scheduledStart: new Date(meeting.scheduledStart),
        duration: meeting.duration,
        participantCount,
        summary,
        actionItems,
        timezone: meeting.user.timezone || "UTC",
      });
    });

    // Send via WAHA
    await step.run("send-whatsapp", async () => {
      const chatId = toChatId(meeting.user.whatsappPhone!);
      await sendText(chatId, message);

      // Mark as sent to prevent duplicates
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { whatsappSummarySentAt: new Date() },
      });

      console.log(
        `[wa-meeting-summary] Sent summary for meeting ${meetingId} to ${meeting.user.whatsappPhone}`
      );
    });

    return { sent: true, meetingId };
  }
);
