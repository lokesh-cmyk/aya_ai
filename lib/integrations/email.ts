// lib/integrations/email.ts
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { MessageChannel, MessageDirection, MessageStatus } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  contactId: string;
  userId?: string;
  html?: string;
}

/**
 * Send email via Resend
 */
export async function sendEmail(params: SendEmailParams) {
  const { to, subject, body, contactId, userId, html } = params;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'team@example.com',
      to: [to],
      subject,
      text: body,
      html: html || body.replace(/\n/g, '<br>'),
    });

    if (error) {
      throw new Error(error.message);
    }

    // Save to database
    const message = await prisma.message.create({
      data: {
        content: body,
        channel: MessageChannel.EMAIL,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.SENT,
        externalId: data?.id,
        contactId,
        userId,
        sentAt: new Date(),
        metadata: { subject },
      },
      include: {
        contact: true,
        user: true,
      }
    });

    // Track analytics
    await prisma.analytics.create({
      data: {
        channel: MessageChannel.EMAIL,
        metric: 'outbound_sent',
        value: 1,
      }
    });

    return message;
  } catch (error) {
    console.error('Email send error:', error);
    
    await prisma.message.create({
      data: {
        content: body,
        channel: MessageChannel.EMAIL,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.FAILED,
        contactId,
        userId,
        metadata: { 
          subject,
          error: String(error) 
        }
      }
    });

    throw error;
  }
}

/**
 * Process incoming email webhook (if using Resend webhooks)
 */
export async function processEmailWebhook(body: any) {
  const { from, subject, text, html, to } = body;

  // Find or create contact
  let contact = await prisma.contact.findFirst({
    where: { email: from }
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        email: from,
        name: from.split('@')[0], // Default name from email
      }
    });
  }

  // Save message
  const message = await prisma.message.create({
    data: {
      content: text || html || '',
      channel: MessageChannel.EMAIL,
      direction: MessageDirection.INBOUND,
      status: MessageStatus.DELIVERED,
      contactId: contact.id,
      sentAt: new Date(),
      metadata: { 
        subject,
        to: to?.[0] || '',
      },
    },
    include: {
      contact: true,
    }
  });

  await prisma.analytics.create({
    data: {
      channel: MessageChannel.EMAIL,
      metric: 'inbound_delivered',
      value: 1,
    }
  });

  return message;
}