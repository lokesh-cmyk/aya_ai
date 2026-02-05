/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { MessageChannel, MessageDirection, MessageStatus } from "@/app/generated/prisma/enums";
import { getGmailClient } from "@/lib/gmail/client"; // Updated import

/**
 * Inngest function to sync Gmail emails in the background
 * Now using Gmail API directly instead of MCP
 */
export const syncGmailEmails = inngest.createFunction(
  { id: "sync-gmail-emails" },
  { event: "email/gmail.sync" },
  async ({ event, step }) => {
    const { userId, teamId, userEmail } = event.data;

    console.log(`[sync-gmail] Starting sync for user ${userId}, team ${teamId}`);

    // Get Gmail integration
    const gmailIntegration = await step.run("get-gmail-integration", async () => {
      return await prisma.integration.findFirst({
        where: {
          name: "gmail",
          type: "pipedream",
          isActive: true,
          OR: [
            ...(teamId ? [{ teamId: teamId }] : []),
            { userId: userId },
            ...(teamId ? [{ config: { path: ["teamId"], equals: teamId } }] : []),
            { config: { path: ["userId"], equals: userId } },
          ],
        },
      });
    });

    if (!gmailIntegration) {
      throw new Error("Gmail integration not found");
    }

    console.log(`[sync-gmail] Integration found: ${gmailIntegration.id}`);

    // Fetch email IDs only (step output must stay small for Inngest limit)
    const gmailData = await step.run("fetch-gmail-emails", async () => {
      try {
        const gmailClient = await getGmailClient(userId, teamId);
        console.log(`[sync-gmail] Gmail API client connected successfully`);

        const query = "newer_than:7d";
        const messages = await gmailClient.searchEmails(query, 50);
        console.log(`[sync-gmail] Found ${messages.length} messages with query: ${query}`);

        if (!messages || messages.length === 0) {
          console.log(`[sync-gmail] No messages found`);
          return { messageIds: [] };
        }

        // Return only id + threadId so step output stays under Inngest limit
        const messageIds = messages.map((msg) => ({
          id: msg.id,
          threadId: msg.threadId ?? undefined,
        }));
        console.log(`[sync-gmail] Returning ${messageIds.length} message IDs (full fetch in each process step)`);
        return { messageIds };
      } catch (error: any) {
        console.error(`[sync-gmail] Gmail client error:`, error);
        throw error;
      }
    });

    console.log(`[sync-gmail] Processing ${gmailData.messageIds.length} emails`);

    // Process each email (same logic as before)
    let processedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    const skipReasons: Record<string, number> = {};

    for (const msgRef of gmailData.messageIds) {
      try {
        await step.run(`process-email-${msgRef.id}`, async () => {
          const gmailClient = await getGmailClient(userId, teamId);
          const messageData = await gmailClient.getEmail(msgRef.id);

          if (!messageData || !messageData.payload) {
            skipReasons['no_payload'] = (skipReasons['no_payload'] || 0) + 1;
            skippedCount++;
            return;
          }

          // Extract email data
          const headers = messageData.payload.headers || [];
          const fromHeader = headers.find((h: any) => h.name === "From");
          const toHeader = headers.find((h: any) => h.name === "To");
          const subjectHeader = headers.find((h: any) => h.name === "Subject");
          const dateHeader = headers.find((h: any) => h.name === "Date");

          if (!fromHeader || !toHeader) {
            console.log(`[sync-gmail] Skipping message ${msgRef.id} - missing from/to headers`);
            skipReasons['missing_headers'] = (skipReasons['missing_headers'] || 0) + 1;
            skippedCount++;
            return;
          }

          const fromEmail =
            fromHeader.value.match(/<(.+)>/)?.[1] ||
            fromHeader.value.trim();
          const toEmail =
            toHeader.value.match(/<(.+)>/)?.[1] ||
            toHeader.value.trim();

          if (!fromEmail || !toEmail) {
            console.log(`[sync-gmail] Skipping message ${msgRef.id} - invalid emails. From: ${fromHeader.value}, To: ${toHeader.value}`);
            skipReasons['invalid_emails'] = (skipReasons['invalid_emails'] || 0) + 1;
            skippedCount++;
            return;
          }

          console.log(`[sync-gmail] Processing message ${msgRef.id}: From=${fromEmail}, To=${toEmail}, UserEmail=${userEmail}`);

          const isInbound = toEmail.toLowerCase() === userEmail?.toLowerCase();

          console.log(`[sync-gmail] Message direction: ${isInbound ? 'INBOUND' : 'OUTBOUND'}`);

          // Check if sender is allowed (for inbound emails)
          if (isInbound && teamId) {
            const fromEmailLower = fromEmail.toLowerCase();

            const [isTeamMember, isAdmin, isContact] = await Promise.all([
              prisma.user.findFirst({
                where: {
                  email: fromEmailLower,
                  teamId: teamId,
                },
              }),
              prisma.user.findFirst({
                where: {
                  email: fromEmailLower,
                  role: "ADMIN",
                },
              }),
              prisma.contact.findFirst({
                where: {
                  email: fromEmailLower,
                  teamId: teamId,
                },
              }),
            ]);

            if (!isTeamMember && !isAdmin && !isContact) {
              console.log(`[sync-gmail] Skipping message ${msgRef.id} - sender ${fromEmail} not allowed (not team member, admin, or contact)`);
              skipReasons['sender_not_allowed'] = (skipReasons['sender_not_allowed'] || 0) + 1;
              skippedCount++;
              return;
            }

            console.log(`[sync-gmail] Sender ${fromEmail} is allowed - TeamMember: ${!!isTeamMember}, Admin: ${!!isAdmin}, Contact: ${!!isContact}`);
          }

          // Skip if already processed
          const existingMessage = await prisma.message.findFirst({
            where: {
              externalId: msgRef.id,
            },
          });

          if (existingMessage) {
            console.log(`[sync-gmail] Skipping message ${msgRef.id} - already exists in database`);
            skipReasons['already_exists'] = (skipReasons['already_exists'] || 0) + 1;
            skippedCount++;
            processedCount++;
            return;
          }

          // Find or create contact
          let contact = await prisma.contact.findFirst({
            where: {
              email: isInbound ? fromEmail : toEmail,
              ...(teamId ? { teamId: teamId } : {}),
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
                  ...(teamId ? { teamId: teamId } : {}),
                },
              });
            } else {
              contact = await prisma.contact.create({
                data: {
                  email: toEmail,
                  name: toEmail.split("@")[0],
                  ...(teamId ? { teamId: teamId } : {}),
                },
              });
            }
          }

          // Extract message body
          let body = "";
          if (messageData.payload.body?.data) {
            body = Buffer.from(
              messageData.payload.body.data,
              "base64"
            ).toString("utf-8");
          } else if (messageData.payload.parts) {
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

          // Use snippet as fallback if no body found
          if (!body && messageData.snippet) {
            body = messageData.snippet;
          }

          if (!body) {
            console.log(`[sync-gmail] Skipping message ${msgRef.id} - no body or snippet`);
            skipReasons['no_body'] = (skipReasons['no_body'] || 0) + 1;
            skippedCount++;
            return;
          }

          console.log(`[sync-gmail] Message ${msgRef.id} - Subject: "${subjectHeader?.value || '(no subject)'}", Body length: ${body.length}`);

          // Create message
          const createdMessage = await prisma.message.create({
            data: {
              content: body.substring(0, 10000),
              channel: MessageChannel.EMAIL,
              direction: isInbound
                ? MessageDirection.INBOUND
                : MessageDirection.OUTBOUND,
              status: MessageStatus.DELIVERED,
              externalId: msgRef.id,
              contactId: contact.id,
              userId: isInbound ? undefined : userId,
              sentAt: dateHeader ? new Date(dateHeader.value) : new Date(),
              metadata: {
                subject: subjectHeader?.value || "",
                from: fromEmail,
                to: toEmail,
                threadId: msgRef.threadId || messageData.threadId,
              },
            },
          });

          console.log(`[sync-gmail] ✓ Created message ${msgRef.id} in database (DB ID: ${createdMessage.id})`);

          createdCount++;
          processedCount++;
        });
      } catch (error: any) {
        console.error(`[sync-gmail] Error processing email ${msgRef.id}:`, error);
        continue;
      }
    }

    // Update last sync time
    await step.run("update-sync-time", async () => {
      await prisma.integration.update({
        where: { id: gmailIntegration.id },
        data: {
          updatedAt: new Date(),
        },
      });
    });

    console.log(`[sync-gmail] Sync complete - processed: ${processedCount}, created: ${createdCount}, skipped: ${skippedCount}`);
    console.log(`[sync-gmail] Skip reasons:`, skipReasons);

    return {
      success: true,
      processed: processedCount,
      created: createdCount,
      skipped: skippedCount,
      skipReasons,
    };
  }
);