// lib/integrations/twilio.ts
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';
import { MessageChannel, MessageDirection, MessageStatus } from '@prisma/client';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER!;

export const twilioClient = twilio(accountSid, authToken);

interface SendMessageParams {
  to: string;
  body: string;
  channel: 'sms' | 'whatsapp';
  mediaUrl?: string[];
  contactId: string;
  userId?: string;
}

/**
 * Send message via Twilio (SMS or WhatsApp)
 */
export async function sendTwilioMessage(params: SendMessageParams) {
  const { to, body, channel, mediaUrl, contactId, userId } = params;
  
  const from = channel === 'whatsapp' 
    ? `whatsapp:${twilioPhone}` 
    : twilioPhone;
  
  const toNumber = channel === 'whatsapp' 
    ? `whatsapp:${to}` 
    : to;

  try {
    const message = await twilioClient.messages.create({
      from,
      to: toNumber,
      body,
      mediaUrl: mediaUrl || undefined,
    });

    // Save to database
    const dbMessage = await prisma.message.create({
      data: {
        content: body,
        channel: channel === 'whatsapp' ? MessageChannel.WHATSAPP : MessageChannel.SMS,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.SENT,
        externalId: message.sid,
        mediaUrls: mediaUrl || [],
        contactId,
        userId,
        sentAt: new Date(),
        metadata: {
          price: message.price,
          priceUnit: message.priceUnit,
        }
      },
      include: {
        contact: true,
        user: true,
      }
    });

    // Track analytics
    await trackMessageAnalytics({
      channel: channel === 'whatsapp' ? MessageChannel.WHATSAPP : MessageChannel.SMS,
      direction: MessageDirection.OUTBOUND,
      status: MessageStatus.SENT,
    });

    return dbMessage;
  } catch (error) {
    console.error('Twilio send error:', error);
    
    // Log failed message
    await prisma.message.create({
      data: {
        content: body,
        channel: channel === 'whatsapp' ? MessageChannel.WHATSAPP : MessageChannel.SMS,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.FAILED,
        mediaUrls: mediaUrl || [],
        contactId,
        userId,
        metadata: { error: String(error) }
      }
    });

    throw error;
  }
}

/**
 * Process incoming Twilio webhook
 */
export async function processTwilioWebhook(body: any) {
  const { MessageSid, From, To, Body, MediaUrl0, NumMedia } = body;
  
  // Determine channel
  const isWhatsApp = From.startsWith('whatsapp:');
  const channel = isWhatsApp ? MessageChannel.WHATSAPP : MessageChannel.SMS;
  const phoneNumber = From.replace('whatsapp:', '');

  // Find or create contact
  let contact = await prisma.contact.findFirst({
    where: { phone: phoneNumber }
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        phone: phoneNumber,
        name: phoneNumber, // Default to phone number
      }
    });
  }

  // Collect media URLs
  const mediaUrls: string[] = [];
  if (NumMedia && parseInt(NumMedia) > 0) {
    for (let i = 0; i < parseInt(NumMedia); i++) {
      const mediaUrl = body[`MediaUrl${i}`];
      if (mediaUrl) mediaUrls.push(mediaUrl);
    }
  }

  // Save message
  const message = await prisma.message.create({
    data: {
      content: Body || '',
      channel,
      direction: MessageDirection.INBOUND,
      status: MessageStatus.DELIVERED,
      externalId: MessageSid,
      mediaUrls,
      contactId: contact.id,
      sentAt: new Date(),
    },
    include: {
      contact: true,
    }
  });

  // Track analytics
  await trackMessageAnalytics({
    channel,
    direction: MessageDirection.INBOUND,
    status: MessageStatus.DELIVERED,
  });

  return message;
}

/**
 * Handle Twilio status callbacks
 */
export async function handleTwilioStatus(body: any) {
  const { MessageSid, MessageStatus } = body;

  const statusMap: Record<string, MessageStatus> = {
    'sent': MessageStatus.SENT,
    'delivered': MessageStatus.DELIVERED,
    'read': MessageStatus.READ,
    'failed': MessageStatus.FAILED,
    'undelivered': MessageStatus.FAILED,
  };

  const status = statusMap[MessageStatus] || MessageStatus.SENT;

  const updateData: any = { status };
  
  if (status === MessageStatus.DELIVERED) {
    updateData.deliveredAt = new Date();
  } else if (status === MessageStatus.READ) {
    updateData.readAt = new Date();
  }

  await prisma.message.updateMany({
    where: { externalId: MessageSid },
    data: updateData,
  });
}

/**
 * Track message analytics
 */
async function trackMessageAnalytics(params: {
  channel: MessageChannel;
  direction: MessageDirection;
  status: MessageStatus;
}) {
  await prisma.analytics.create({
    data: {
      channel: params.channel,
      metric: `${params.direction}_${params.status}`.toLowerCase(),
      value: 1,
    }
  });
}

/**
 * Get available Twilio phone numbers
 */
export async function getAvailableNumbers(areaCode?: string) {
  const numbers = await twilioClient.availablePhoneNumbers('US')
    .local
    .list({
      areaCode,
      smsEnabled: true,
      mmsEnabled: true,
      limit: 20
    });

  return numbers.map(num => ({
    phoneNumber: num.phoneNumber,
    friendlyName: num.friendlyName,
    locality: num.locality,
    region: num.region,
    capabilities: num.capabilities,
  }));
}

/**
 * Buy a Twilio phone number
 */
export async function buyTwilioNumber(phoneNumber: string) {
  const number = await twilioClient.incomingPhoneNumbers.create({
    phoneNumber,
    smsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`,
    smsMethod: 'POST',
    statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`,
    statusCallbackMethod: 'POST',
  });

  return number;
}