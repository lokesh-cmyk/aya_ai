/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MessageChannel, MessageDirection, MessageStatus } from '@/app/generated/prisma/enums';

/**
 * Webhook handler for Gmail push notifications
 * This endpoint receives notifications when new emails arrive
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Gmail push notifications structure
    // https://developers.google.com/gmail/api/guides/push
    
    if (body.message?.data) {
      // Decode the base64 message data
      const messageData = JSON.parse(
        Buffer.from(body.message.data, 'base64').toString('utf-8')
      );

      const emailId = messageData.emailId;
      const historyId = messageData.historyId;

      if (!emailId) {
        return NextResponse.json({ success: true, message: 'No email ID' });
      }

      // Get all active Gmail integrations
      const gmailIntegrations = await prisma.integration.findMany({
        where: {
          name: 'gmail',
          type: 'pipedream',
          isActive: true,
        },
      });

      // Process email for each connected Gmail account via Inngest
      for (const integration of gmailIntegrations) {
        const config = integration.config as any;
        const accessToken = config.accessToken;
        const teamId = config.teamId;
        const userId = config.userId;

        if (!accessToken || !teamId) continue;

        try {
          // Send event to Inngest to process in background
          const { inngest } = await import('@/lib/inngest/client');
          await inngest.send({
            name: 'webhook/gmail.notification',
            data: {
              emailId: emailId,
              integrationId: integration.id,
              teamId: teamId,
              userId: userId,
              userEmail: config.userEmail || '',
            },
          }).catch((err) => {
            console.error(`Failed to send webhook event for integration ${integration.id}:`, err);
          });
        } catch (error: any) {
          console.error(`Error triggering webhook processing for integration ${integration.id}:`, error);
          continue;
        }
      }
      
      // Old synchronous processing (kept for reference but not used)
      if (false) {
      for (const integration of gmailIntegrations) {
        const config = integration.config as any;
        const accessToken = config.accessToken;
        const teamId = config.teamId;

        if (!accessToken || !teamId) continue;

        try {
          // Fetch the email from Gmail API
          const messageResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}?format=full`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          if (!messageResponse.ok) continue;

          const messageData = await messageResponse.json();
          
          // Extract email data
          const headers = messageData.payload?.headers || [];
          const fromHeader = headers.find((h: any) => h.name === 'From');
          const toHeader = headers.find((h: any) => h.name === 'To');
          const subjectHeader = headers.find((h: any) => h.name === 'Subject');
          const dateHeader = headers.find((h: any) => h.name === 'Date');

          if (!fromHeader || !toHeader) continue;

          // Extract email addresses
          const fromEmail = fromHeader.value.match(/<(.+)>/)?.[1] || fromHeader.value.split(' ').pop()?.trim();
          const toEmail = toHeader.value.match(/<(.+)>/)?.[1] || toHeader.value.split(' ').pop()?.trim();

          if (!fromEmail || !toEmail) continue;

          // Get user email from integration config
          const userEmail = config.userEmail || toEmail;

          // Check if this email is inbound (to the user) or outbound (from the user)
          const isInbound = toEmail.toLowerCase() === userEmail.toLowerCase();

          // For inbound emails, check if sender is allowed:
          // 1. Team member
          // 2. Admin user
          // 3. Added contact
          if (isInbound) {
            const fromEmailLower = fromEmail.toLowerCase();
            
            // Check if sender is a team member
            const isTeamMember = await prisma.user.findFirst({
              where: {
                email: fromEmailLower,
                teamId: teamId,
              },
            });
            
            // Check if sender is an admin
            const isAdmin = await prisma.user.findFirst({
              where: {
                email: fromEmailLower,
                role: 'ADMIN',
              },
            });
            
            // Check if sender is an added contact
            const isContact = await prisma.contact.findFirst({
              where: {
                email: fromEmailLower,
                teamId: teamId,
              },
            });
            
            // Skip if sender is not allowed
            if (!isTeamMember && !isAdmin && !isContact) {
              console.log(`Webhook: Skipping email from ${fromEmail} - not a team member, admin, or contact`);
              continue;
            }
          }

          // Skip if already processed
          const existingMessage = await prisma.message.findFirst({
            where: {
              externalId: emailId,
            },
          });

          if (existingMessage) continue;

          // Find or create contact
          let contact = await prisma.contact.findFirst({
            where: {
              email: isInbound ? fromEmail : toEmail,
              teamId: teamId,
            },
          });

          if (!contact) {
            if (isInbound) {
              // For inbound, we've already verified the sender is allowed
              contact = await prisma.contact.create({
                data: {
                  email: fromEmail,
                  name: fromHeader.value.split('<')[0].trim() || fromEmail.split('@')[0],
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
                    name: toEmail.split('@')[0],
                    teamId: teamId,
                  },
                });
              }
            }
          }

          // Extract message body
          let body = '';
          if (messageData.payload?.body?.data) {
            body = Buffer.from(messageData.payload.body.data, 'base64').toString('utf-8');
          } else if (messageData.payload?.parts) {
            for (const part of messageData.payload.parts) {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                body = Buffer.from(part.body.data, 'base64').toString('utf-8');
                break;
              }
              if (part.mimeType === 'text/html' && part.body?.data && !body) {
                body = Buffer.from(part.body.data, 'base64').toString('utf-8');
              }
            }
          }

          if (!body) continue;
          if (!contact) continue;

          // Create message
          await prisma.message.create({
            data: {
              content: body.substring(0, 10000), // Limit content length
              channel: MessageChannel.EMAIL,
              direction: isInbound ? MessageDirection.INBOUND : MessageDirection.OUTBOUND,
              status: MessageStatus.DELIVERED,
              externalId: emailId,
              contactId: contact!.id,
              userId: isInbound ? undefined : config.userId,
              sentAt: dateHeader ? new Date(dateHeader.value) : new Date(),
              metadata: {
                subject: subjectHeader?.value || '',
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
              metric: isInbound ? 'inbound_delivered' : 'outbound_sent',
              value: 1,
            },
          });
        } catch (error: any) {
          console.error(`Error processing email ${emailId} for integration ${integration.id}:`, error);
          continue;
        }
      }
      } // End of if (false) block
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Gmail webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Gmail webhook verification (GET)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');

  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'No challenge provided' }, { status: 400 });
}
