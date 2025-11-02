// lib/integrations/facebook.ts
interface SendFacebookMessageParams {
  recipientId: string;
  message: string;
  contactId: string;
  userId?: string;
}

/**
 * Send Facebook Messenger message
 */
export async function sendFacebookMessage(params: SendFacebookMessageParams) {
  const { recipientId, message, contactId, userId } = params;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.statusText}`);
    }

    const data = await response.json();

    const dbMessage = await prisma.message.create({
      data: {
        content: message,
        channel: MessageChannel.FACEBOOK,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.SENT,
        externalId: data.message_id,
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
        channel: MessageChannel.FACEBOOK,
        metric: 'outbound_sent',
        value: 1,
      }
    });

    return dbMessage;
  } catch (error) {
    console.error('Facebook message error:', error);
    
    await prisma.message.create({
      data: {
        content: message,
        channel: MessageChannel.FACEBOOK,
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
 * Process Facebook webhook for incoming messages
 */
export async function processFacebookWebhook(body: any) {
  const { entry } = body;

  for (const item of entry || []) {
    const messaging = item.messaging || [];

    for (const event of messaging) {
      if (!event.message) continue;

      const senderId = event.sender.id;
      const text = event.message.text;

      // Find or create contact
      let contact = await prisma.contact.findFirst({
        where: { facebookId: senderId }
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            facebookId: senderId,
            name: `Facebook User ${senderId}`,
          }
        });
      }

      await prisma.message.create({
        data: {
          content: text || '',
          channel: MessageChannel.FACEBOOK,
          direction: MessageDirection.INBOUND,
          status: MessageStatus.DELIVERED,
          externalId: event.message.mid,
          contactId: contact.id,
          sentAt: new Date(event.timestamp),
        }
      });

      await prisma.analytics.create({
        data: {
          channel: MessageChannel.FACEBOOK,
          metric: 'inbound_delivered',
          value: 1,
        }
      });
    }
  }
}