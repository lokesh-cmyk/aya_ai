import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGmailClient } from '@/lib/gmail/client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const replySchema = z.object({
  to: z.string().email('Valid email is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Message body is required'),
  threadId: z.string().min(1, 'Thread ID is required'),
  messageId: z.string().min(1, 'Message ID is required'),
  contactId: z.string().optional(),
  cc: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = replySchema.parse(body);

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    // Get Gmail client
    const gmailClient = await getGmailClient(session.user.id, user?.teamId || null);

    // Send reply
    const result = await gmailClient.replyToEmail({
      to: validated.to,
      subject: validated.subject,
      body: validated.body,
      threadId: validated.threadId,
      messageId: validated.messageId,
      cc: validated.cc,
    });

    // Save outbound message to database
    if (validated.contactId) {
      try {
        await prisma.message.create({
          data: {
            content: validated.body,
            channel: 'EMAIL',
            direction: 'OUTBOUND',
            status: 'SENT',
            externalId: result.id,
            contactId: validated.contactId,
            userId: session.user.id,
            sentAt: new Date(),
            metadata: {
              threadId: validated.threadId,
              subject: validated.subject,
              to: validated.to,
              gmailMessageId: result.id,
            },
          },
        });
      } catch (dbError: any) {
        console.warn('[Gmail Reply] Failed to save to DB:', dbError.message);
      }
    }

    return NextResponse.json({
      success: true,
      messageId: result.id,
      threadId: result.threadId,
    });
  } catch (error: any) {
    console.error('[gmail/reply] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to send reply' },
      { status: 500 }
    );
  }
}
