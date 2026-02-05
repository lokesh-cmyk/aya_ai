/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { MessageChannel, MessageDirection, MessageStatus } from "@/app/generated/prisma/enums";

/**
 * Inngest function to sync Outlook emails in the background
 * Triggered by event: email/outlook.sync
 */
export const syncOutlookEmails = inngest.createFunction(
  { id: "sync-outlook-emails" },
  { event: "email/outlook.sync" },
  async ({ event, step }) => {
    const { userId, teamId, userEmail } = event.data;

    // Get Outlook integration
    const outlookIntegration = await step.run("get-outlook-integration", async () => {
      return await prisma.integration.findFirst({
        where: {
          name: "outlook",
          type: "pipedream",
          isActive: true,
          OR: [
            { config: { path: ["teamId"], equals: teamId } },
            { config: { path: ["userId"], equals: userId } },
          ],
        },
      });
    });

    if (!outlookIntegration) {
      throw new Error("Outlook integration not found");
    }

    // Get access token
    const accessToken = await step.run("get-access-token", async () => {
      const config = outlookIntegration.config as any;
      let token = config.accessToken;

      if (!token) {
        const { PipedreamClient } = await import("@pipedream/sdk/server");
        const { ProjectEnvironment } = await import("@pipedream/sdk/server");

        const getProjectEnvironment = () => {
          const env = process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "development";
          return env === "production"
            ? ProjectEnvironment.Production
            : ProjectEnvironment.Development;
        };

        const pd = new PipedreamClient({
          clientId: process.env.PIPEDREAM_CLIENT_ID!,
          clientSecret: process.env.PIPEDREAM_CLIENT_SECRET!,
          projectEnvironment: getProjectEnvironment(),
          projectId: process.env.PIPEDREAM_PROJECT_ID!,
        });

        const accountsResponse = await pd.accounts.list({
          externalUserId: userId,
          includeCredentials: true,
        });

        let accounts: any[] = [];
        if (Array.isArray(accountsResponse)) {
          accounts = accountsResponse;
        } else if (accountsResponse && typeof accountsResponse === "object") {
          const responseAny = accountsResponse as any;
          if (responseAny.response?.data && Array.isArray(responseAny.response.data)) {
            accounts = responseAny.response.data;
          } else if (Array.isArray(responseAny.data)) {
            accounts = responseAny.data;
          }
        }

        const outlookAccount = accounts.find((acc: any) => {
          const appSlug = acc.app?.nameSlug || acc.app?.name || acc.app || acc.name || "";
          const appLower = String(appSlug).toLowerCase();
          return (
            appLower === "outlook" ||
            appLower === "microsoft_outlook" ||
            appLower.includes("outlook")
          );
        });

        if (outlookAccount?.credentials) {
          token =
            outlookAccount.credentials.access_token ||
            outlookAccount.credentials.oauth_access_token ||
            outlookAccount.credentials.accessToken ||
            outlookAccount.credentials.token;
        }
      }

      if (!token) {
        throw new Error("Outlook access token not found");
      }

      return token;
    });

    // Fetch emails from Microsoft Graph API
    const messages = await step.run("fetch-outlook-emails", async () => {
      const graphResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages?$top=50&$filter=isRead eq false or receivedDateTime ge ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!graphResponse.ok) {
        throw new Error(`Graph API error: ${graphResponse.status}`);
      }

      const graphData = await graphResponse.json();
      return graphData.value || [];
    });

    // Process each email
    let processedCount = 0;
    let createdCount = 0;

    for (const msg of messages.slice(0, 20)) {
      try {
        await step.run(`process-email-${msg.id}`, async () => {
          const fromEmail = msg.from?.emailAddress?.address;
          const toEmail = msg.toRecipients?.[0]?.emailAddress?.address || userEmail;
          const subject = msg.subject || "";
          const body = msg.body?.content || "";
          const receivedDateTime = msg.receivedDateTime;

          if (!fromEmail || !toEmail) return;

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
              return; // Skip this email
            }
          }

          // Skip if already processed
          const existingMessage = await prisma.message.findFirst({
            where: {
              externalId: msg.id,
            },
          });

          if (existingMessage) {
            processedCount++;
            return;
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
                  name: msg.from?.emailAddress?.name || fromEmail.split("@")[0],
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

          if (!body) return;

          // Create message
          await prisma.message.create({
            data: {
              content: body.substring(0, 10000),
              channel: MessageChannel.EMAIL,
              direction: isInbound
                ? MessageDirection.INBOUND
                : MessageDirection.OUTBOUND,
              status: MessageStatus.DELIVERED,
              externalId: msg.id,
              contactId: contact.id,
              userId: isInbound ? undefined : userId,
              sentAt: receivedDateTime ? new Date(receivedDateTime) : new Date(),
              metadata: {
                subject: subject,
                from: fromEmail,
                to: toEmail,
                conversationId: msg.conversationId,
              },
            },
          });

          createdCount++;
          processedCount++;
        });
      } catch (error: any) {
        console.error(`Error processing email ${msg.id}:`, error);
        continue;
      }
    }

    // Update last sync time
    await step.run("update-sync-time", async () => {
      await prisma.integration.update({
        where: { id: outlookIntegration.id },
        data: {
          updatedAt: new Date(),
        },
      });
    });

    return {
      success: true,
      processed: processedCount,
      created: createdCount,
    };
  }
);
