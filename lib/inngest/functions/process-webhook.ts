/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { MessageChannel, MessageDirection, MessageStatus } from "@/app/generated/prisma/enums";

/**
 * Inngest function to process Gmail webhook notifications in the background
 * Triggered by event: webhook/gmail.notification
 */
export const processGmailWebhook = inngest.createFunction(
  { id: "process-gmail-webhook" },
  { event: "webhook/gmail.notification" },
  async ({ event, step }) => {
    const { emailId, integrationId, teamId, userId, userEmail } = event.data;

    await step.run("process-email", async () => {
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        throw new Error("Integration not found");
      }

      const config = integration.config as any;
      const accessToken = config.accessToken;

      if (!accessToken) {
        throw new Error("Access token not found");
      }

      // Fetch the email from Gmail API
      const messageResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}?format=full`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!messageResponse.ok) {
        throw new Error(`Gmail API error: ${messageResponse.status}`);
      }

      const messageData = await messageResponse.json();

      // Extract email data
      const headers = messageData.payload?.headers || [];
      const fromHeader = headers.find((h: any) => h.name === "From");
      const toHeader = headers.find((h: any) => h.name === "To");
      const subjectHeader = headers.find((h: any) => h.name === "Subject");
      const dateHeader = headers.find((h: any) => h.name === "Date");

      if (!fromHeader || !toHeader) {
        return { skipped: true, reason: "Missing headers" };
      }

      const fromEmail =
        fromHeader.value.match(/<(.+)>/)?.[1] ||
        fromHeader.value.split(" ").pop()?.trim();
      const toEmail =
        toHeader.value.match(/<(.+)>/)?.[1] ||
        toHeader.value.split(" ").pop()?.trim();

      if (!fromEmail || !toEmail) {
        return { skipped: true, reason: "Missing email addresses" };
      }

      const isInbound = toEmail.toLowerCase() === userEmail?.toLowerCase();

      // Check if sender is allowed (for inbound emails)
      if (isInbound) {
        const fromEmailLower = fromEmail.toLowerCase();

        const isTeamMember = await prisma.user.findFirst({
          where: {
            email: fromEmailLower,
            teamId: teamId,
          },
        });

        const isAdmin = await prisma.user.findFirst({
          where: {
            email: fromEmailLower,
            role: "ADMIN",
          },
        });

        const isContact = await prisma.contact.findFirst({
          where: {
            email: fromEmailLower,
            teamId: teamId,
          },
        });

        if (!isTeamMember && !isAdmin && !isContact) {
          return { skipped: true, reason: "Sender not allowed" };
        }
      }

      // Skip if already processed
      const existingMessage = await prisma.message.findFirst({
        where: {
          externalId: emailId,
        },
      });

      if (existingMessage) {
        return { skipped: true, reason: "Already processed" };
      }

      // Find or create contact
      let contact = await prisma.contact.findFirst({
        where: {
          email: isInbound ? fromEmail : toEmail,
          teamId: teamId,
        },
      });

      if (!contact) {
        if (isInbound) {
          contact = await prisma.contact.create({
            data: {
              email: fromEmail,
              name:
                fromHeader.value.split("<")[0].trim() ||
                fromEmail.split("@")[0],
              teamId: teamId,
            },
          });
        } else {
          contact = await prisma.contact.findFirst({
            where: {
              email: toEmail,
              teamId: teamId,
            },
          });

          if (!contact) {
            contact = await prisma.contact.create({
              data: {
                email: toEmail,
                name: toEmail.split("@")[0],
                teamId: teamId,
              },
            });
          }
        }
      }

      // Extract message body
      let body = "";
      if (messageData.payload?.body?.data) {
        body = Buffer.from(messageData.payload.body.data, "base64").toString(
          "utf-8"
        );
      } else if (messageData.payload?.parts) {
        for (const part of messageData.payload.parts) {
          if (part.mimeType === "text/plain" && part.body?.data) {
            body = Buffer.from(part.body.data, "base64").toString("utf-8");
            break;
          }
          if (part.mimeType === "text/html" && part.body?.data && !body) {
            body = Buffer.from(part.body.data, "base64").toString("utf-8");
          }
        }
      }

      if (!body) {
        return { skipped: true, reason: "No body content" };
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          content: body.substring(0, 10000),
          channel: MessageChannel.EMAIL,
          direction: isInbound
            ? MessageDirection.INBOUND
            : MessageDirection.OUTBOUND,
          status: MessageStatus.DELIVERED,
          externalId: emailId,
          contactId: contact.id,
          userId: isInbound ? undefined : userId,
          sentAt: dateHeader ? new Date(dateHeader.value) : new Date(),
          metadata: {
            subject: subjectHeader?.value || "",
            from: fromEmail,
            to: toEmail,
            threadId: messageData.threadId,
          },
        },
      });

      // Track analytics
      await prisma.analytics.create({
        data: {
          channel: MessageChannel.EMAIL,
          metric: isInbound ? "inbound_delivered" : "outbound_sent",
          value: 1,
        },
      });

      return { success: true, messageId: message.id };
    });

    return { success: true };
  }
);
