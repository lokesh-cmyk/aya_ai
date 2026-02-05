/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { sendMessage } from '@/lib/integrations/factory';
import { MessageStatus, MessageChannel } from '@/app/generated/prisma/enums';

/**
 * Process scheduled messages that are due
 */
export async function processScheduledMessages() {
  try {
    const now = new Date();

    // Find messages scheduled for now or earlier
    const scheduledMessages = await prisma.message.findMany({
      where: {
        status: MessageStatus.SCHEDULED,
        scheduledFor: {
          lte: now,
        }
      },
      include: {
        contact: true,
      }
    });

    console.log(`Processing ${scheduledMessages.length} scheduled messages`);

    for (const message of scheduledMessages) {
      try {
        // Determine recipient based on channel
        let recipient = '';
        switch (message.channel) {
          case MessageChannel.SMS:
          case MessageChannel.WHATSAPP:
            recipient = message.contact.phone || '';
            break;
          case MessageChannel.EMAIL:
            recipient = message.contact.email || '';
            break;
          case MessageChannel.TWITTER:
            recipient = message.contact.twitterHandle || '';
            break;
          case MessageChannel.FACEBOOK:
            recipient = message.contact.facebookId || '';
            break;
        }

        if (!recipient) {
          // Mark as failed if no recipient info
          await prisma.message.update({
            where: { id: message.id },
            data: {
              status: MessageStatus.FAILED,
              metadata: {
                ...((message.metadata as any) || {}),
                error: `No ${message.channel} contact info available`,
              }
            }
          });
          continue;
        }

        // Send the message
        await sendMessage(message.channel, {
          to: recipient,
          body: message.content,
          mediaUrl: message.mediaUrls,
          contactId: message.contactId,
          userId: message.userId || undefined,
        });

        // Update status to sent
        await prisma.message.update({
          where: { id: message.id },
          data: {
            status: MessageStatus.SENT,
            sentAt: new Date(),
          }
        });

        console.log(`Sent scheduled message ${message.id}`);
      } catch (error) {
        console.error(`Failed to send scheduled message ${message.id}:`, error);
        
        // Mark as failed
        await prisma.message.update({
          where: { id: message.id },
          data: {
            status: MessageStatus.FAILED,
            metadata: {
              ...((message.metadata as any) || {}),
              error: String(error),
            }
          }
        });
      }
    }

    return {
      processed: scheduledMessages.length,
      timestamp: now,
    };
  } catch (error) {
    console.error('Scheduler error:', error);
    throw error;
  }
}

/**
 * Create a scheduled message template
 */
export async function createMessageTemplate(params: {
  name: string;
  content: string;
  channel: MessageChannel;
  delayMinutes?: number;
  delayDays?: number;
}) {
  const { name, content, channel, delayMinutes = 0, delayDays = 0 } = params;

  const template = await prisma.integration.create({
    data: {
      name,
      type: 'MESSAGE_TEMPLATE',
      config: {
        content,
        channel,
        delayMinutes,
        delayDays,
      },
      isActive: true,
    }
  });

  return template;
}

/**
 * Schedule a message from a template
 */
export async function scheduleFromTemplate(params: {
  templateId: string;
  contactId: string;
  userId?: string;
  customContent?: string;
}) {
  const { templateId, contactId, userId, customContent } = params;

  const template = await prisma.integration.findUnique({
    where: { id: templateId }
  });

  if (!template || template.type !== 'MESSAGE_TEMPLATE') {
    throw new Error('Template not found');
  }

  const config = template.config as any;
  const delayMs = (config.delayMinutes * 60 * 1000) + (config.delayDays * 24 * 60 * 60 * 1000);
  const scheduledFor = new Date(Date.now() + delayMs);

  const message = await prisma.message.create({
    data: {
      content: customContent || config.content,
      channel: config.channel,
      direction: 'OUTBOUND',
      status: MessageStatus.SCHEDULED,
      scheduledFor,
      contactId,
      userId,
      metadata: {
        templateId,
        templateName: template.name,
      }
    },
    include: {
      contact: true,
    }
  });

  return message;
}

/**
 * Cancel a scheduled message
 */
export async function cancelScheduledMessage(messageId: string) {
  const message = await prisma.message.update({
    where: { id: messageId },
    data: {
      status: MessageStatus.FAILED,
      metadata: {
        cancelled: true,
        cancelledAt: new Date().toISOString(),
      }
    }
  });

  return message;
}

/**
 * Get all scheduled messages
 */
export async function getScheduledMessages(filters?: {
  contactId?: string;
  userId?: string;
  channel?: MessageChannel;
}) {
  const messages = await prisma.message.findMany({
    where: {
      status: MessageStatus.SCHEDULED,
      ...filters,
    },
    include: {
      contact: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    },
    orderBy: {
      scheduledFor: 'asc',
    }
  });

  return messages;
}
