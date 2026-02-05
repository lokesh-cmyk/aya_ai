/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";

/**
 * Inngest function to trigger Gmail connection webhook in the background
 * Triggered by event: integration/gmail.connected
 */
export const triggerGmailWebhook = inngest.createFunction(
  { id: "trigger-gmail-webhook" },
  { event: "integration/gmail.connected" },
  async ({ event, step }) => {
    const { userId, userEmail, teamId, platform, accountId } = event.data;

    await step.run("trigger-webhook", async () => {
      const webhookUrl =
        process.env.PIPEDREAM_GMAIL_WEBHOOK_URL ||
        "https://eocjkejo1fxd2lr.m.pipedream.net";
      const webhookBody = {
        event: "gmail_connected",
        userId,
        userEmail,
        teamId,
        platform,
        accountId,
        connectedAt: new Date().toISOString(),
      };

      const pipedreamEnvironment =
        process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "development";

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-pd-external-user-id": userId,
          "x-pd-environment": pipedreamEnvironment,
        },
        mode: "cors",
        body: JSON.stringify(webhookBody),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      return { success: true };
    });

    return { success: true };
  }
);
