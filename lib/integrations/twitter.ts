// lib/integrations/twitter.ts
import { prisma } from '@/lib/prisma';
import { MessageChannel, MessageDirection, MessageStatus } from '@prisma/client';

interface SendTwitterDMParams {
  recipientId: string;
  text: string;
  contactId: string;
  userId?: string;
}

/**
 * Send Twitter DM via Twitter API v2
 */
export async function sendTwitterDM(params: SendTwitterDMParams) {
  const { recipientId, text, contactId, userId } = params;

  try {
    const response = await fetch(
      'https://api.twitter.com/2/dm_conversations/with/:participant_id/messages',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          participant_id: recipientId,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.statusText}`);
    }

    const data = await response.json();

    const message = await prisma.message.create({
      data: {
        content: text,
        channel: MessageChannel.TWITTER,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.SENT,
        externalId: data.dm_event_id,
        contactId,
        userId,
        sentAt: new Date(),
      },
      include: {
        contact: true,
        user: true,
      }
    });

    await prisma.analytics.create({
      data: {
        channel: MessageChannel.TWITTER,
        metric: 'outbound_sent',
        value: 1,
      }
    });

    return message;
  } catch (error) {
    console.error('Twitter DM error:', error);
    
    await prisma.message.create({
      data: {
        content: text,
        channel: MessageChannel.TWITTER,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.FAILED,
        contactId,
        userId,
        metadata: { error: String(error) }
      }
    });

    throw error;
  }
}

/**
 * Process Twitter webhook for incoming DMs
 */
export async function processTwitterWebhook(body: any) {
  const { direct_message_events } = body;

  for (const event of direct_message_events || []) {
    if (event.type !== 'message_create') continue;

    const senderId = event.message_create.sender_id;
    const text = event.message_create.message_data.text;

    // Find or create contact
    let contact = await prisma.contact.findFirst({
      where: { twitterHandle: senderId }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          twitterHandle: senderId,
          name: `Twitter User ${senderId}`,
        }
      });
    }

    await prisma.message.create({
      data: {
        content: text,
        channel: MessageChannel.TWITTER,
        direction: MessageDirection.INBOUND,
        status: MessageStatus.DELIVERED,
        externalId: event.id,
        contactId: contact.id,
        sentAt: new Date(parseInt(event.created_timestamp)),
      }
    });

    await prisma.analytics.create({
      data: {
        channel: MessageChannel.TWITTER,
        metric: 'inbound_delivered',
        value: 1,
      }
    });
  }
}

