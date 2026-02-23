/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";
import { processMessage } from "@/lib/whatsapp/processor";
import { sendText, toChatId, startTyping, stopTyping } from "@/lib/integrations/waha";

/**
 * Process complex WhatsApp messages that need Composio tools.
 * Triggered by the webhook handler when intent is "complex".
 */
export const processComplexWhatsAppMessage = inngest.createFunction(
  {
    id: "process-complex-whatsapp-message",
    concurrency: [
      {
        key: "event.data.userId",
        limit: 1, // Process one message at a time per user
      },
    ],
    retries: 2,
  },
  { event: "whatsapp/process-complex-message" },
  async ({ event }) => {
    const {
      userId,
      phone,
      messageText,
      wahaMessageId,
      userName,
      userEmail,
      teamId,
      timezone,
      whatsappDigestEnabled,
      whatsappMeetingSummaryEnabled,
    } = event.data;

    const chatId = toChatId(phone);

    try {
      // Show typing indicator
      await startTyping(chatId).catch(() => {});

      const result = await processMessage(
        {
          id: userId,
          name: userName,
          email: userEmail,
          teamId,
          timezone,
          whatsappDigestEnabled,
          whatsappMeetingSummaryEnabled: whatsappMeetingSummaryEnabled ?? false,
        },
        phone,
        messageText,
        wahaMessageId,
        true // include Composio tools
      );

      // Send responses
      for (const msg of result.messages) {
        await sendText(chatId, msg);
      }

      await stopTyping(chatId).catch(() => {});

      return {
        success: true,
        userId,
        conversationId: result.conversationId,
        messageCount: result.messages.length,
      };
    } catch (error: any) {
      console.error("[whatsapp-inngest] Error processing complex message:", error);

      await stopTyping(chatId).catch(() => {});
      await sendText(
        chatId,
        "Sorry, I had trouble processing that request. Could you try again?"
      ).catch(() => {});

      throw error; // Let Inngest retry
    }
  }
);
