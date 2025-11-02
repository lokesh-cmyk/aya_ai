// lib/integrations/factory.ts
import { MessageChannel } from '@prisma/client';
import { sendTwilioMessage } from './twilio';
import { sendEmail } from './email';
import { sendTwitterDM } from './twitter';
import { sendFacebookMessage } from './facebook';

export interface SendMessagePayload {
  to: string;
  body: string;
  mediaUrl?: string[];
  contactId: string;
  userId?: string;
  scheduledFor?: Date;
}

export interface ChannelSender {
  send(payload: SendMessagePayload): Promise<any>;
  validate(recipient: string): boolean;
}

/**
 * SMS Channel Sender
 */
class SMSSender implements ChannelSender {
  async send(payload: SendMessagePayload) {
    return sendTwilioMessage({
      ...payload,
      channel: 'sms',
    });
  }

  validate(recipient: string): boolean {
    // Basic phone validation
    return /^\+?[1-9]\d{1,14}$/.test(recipient.replace(/\s/g, ''));
  }
}

/**
 * WhatsApp Channel Sender
 */
class WhatsAppSender implements ChannelSender {
  async send(payload: SendMessagePayload) {
    return sendTwilioMessage({
      ...payload,
      channel: 'whatsapp',
    });
  }

  validate(recipient: string): boolean {
    return /^\+?[1-9]\d{1,14}$/.test(recipient.replace(/\s/g, ''));
  }
}

/**
 * Email Channel Sender
 */
class EmailSender implements ChannelSender {
  async send(payload: SendMessagePayload) {
    return sendEmail({
      to: payload.to,
      subject: 'Message from Team',
      body: payload.body,
      contactId: payload.contactId,
      userId: payload.userId,
    });
  }

  validate(recipient: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient);
  }
}

/**
 * Twitter DM Sender
 */
class TwitterSender implements ChannelSender {
  async send(payload: SendMessagePayload) {
    return sendTwitterDM({
      recipientId: payload.to,
      text: payload.body,
      contactId: payload.contactId,
      userId: payload.userId,
    });
  }

  validate(recipient: string): boolean {
    return /^\d+$/.test(recipient); // Twitter uses numeric IDs
  }
}

/**
 * Facebook Messenger Sender
 */
class FacebookSender implements ChannelSender {
  async send(payload: SendMessagePayload) {
    return sendFacebookMessage({
      recipientId: payload.to,
      message: payload.body,
      contactId: payload.contactId,
      userId: payload.userId,
    });
  }

  validate(recipient: string): boolean {
    return /^\d+$/.test(recipient); // Facebook uses numeric IDs
  }
}

/**
 * Factory to create channel sender
 */
export function createSender(channel: MessageChannel | string): ChannelSender {
  const channelMap: Record<string, ChannelSender> = {
    [MessageChannel.SMS]: new SMSSender(),
    [MessageChannel.WHATSAPP]: new WhatsAppSender(),
    [MessageChannel.EMAIL]: new EmailSender(),
    [MessageChannel.TWITTER]: new TwitterSender(),
    [MessageChannel.FACEBOOK]: new FacebookSender(),
  };

  const sender = channelMap[channel.toUpperCase()];
  
  if (!sender) {
    throw new Error(`Unsupported channel: ${channel}`);
  }

  return sender;
}

/**
 * Send message through appropriate channel
 */
export async function sendMessage(
  channel: MessageChannel,
  payload: SendMessagePayload
): Promise<any> {
  const sender = createSender(channel);
  
  // Validate recipient
  if (!sender.validate(payload.to)) {
    throw new Error(`Invalid recipient for ${channel}: ${payload.to}`);
  }

  // If scheduled, don't send immediately
  if (payload.scheduledFor && payload.scheduledFor > new Date()) {
    const { prisma } = await import('@/lib/prisma');
    return prisma.message.create({
      data: {
        content: payload.body,
        channel,
        direction: 'OUTBOUND',
        status: 'SCHEDULED',
        scheduledFor: payload.scheduledFor,
        mediaUrls: payload.mediaUrl || [],
        contactId: payload.contactId,
        userId: payload.userId,
      }
    });
  }

  return sender.send(payload);
}

/**
 * Channel configuration and metadata
 */
export const CHANNEL_CONFIG = {
  [MessageChannel.SMS]: {
    name: 'SMS',
    icon: '💬',
    color: 'blue',
    avgLatency: 50, // ms
    costPerMessage: 0.0075, // USD
    reliability: 0.99,
    features: ['text', 'mms', 'delivery-receipt'],
  },
  [MessageChannel.WHATSAPP]: {
    name: 'WhatsApp',
    icon: '📱',
    color: 'green',
    avgLatency: 100,
    costPerMessage: 0.005,
    reliability: 0.98,
    features: ['text', 'media', 'read-receipt', 'typing-indicator'],
  },
  [MessageChannel.EMAIL]: {
    name: 'Email',
    icon: '📧',
    color: 'red',
    avgLatency: 2000,
    costPerMessage: 0.001,
    reliability: 0.97,
    features: ['text', 'html', 'attachments', 'threading'],
  },
  [MessageChannel.TWITTER]: {
    name: 'Twitter DM',
    icon: '🐦',
    color: 'sky',
    avgLatency: 500,
    costPerMessage: 0,
    reliability: 0.95,
    features: ['text', 'media', 'read-receipt'],
  },
  [MessageChannel.FACEBOOK]: {
    name: 'Facebook',
    icon: '👥',
    color: 'indigo',
    avgLatency: 300,
    costPerMessage: 0,
    reliability: 0.96,
    features: ['text', 'media', 'read-receipt', 'typing-indicator'],
  },
} as const;