/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sendMessage } from '@/lib/integrations/factory';
import { getSessionCookie } from '@/lib/auth';
import { z } from 'zod';
import { MessageChannel } from '@/app/generated/prisma/enums';

const sendMessageSchema = z.object({
  contactId: z.string(),
  channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL', 'TWITTER', 'FACEBOOK']),
  content: z.string().min(1),
  mediaUrls: z.array(z.string()).optional(),
  scheduledFor: z.string().datetime().optional(),
  userId: z.string().optional(),
});

// Get messages with filters
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { auth } = await import('@/lib/auth');
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const channel = searchParams.get('channel');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause for messages
    const where: any = {};

    // Filter messages by team through contact (if user has a team)
    if (user?.teamId) {
      where.contact = {
        teamId: user.teamId,
      };
    }

    if (contactId) where.contactId = contactId;
    if (channel) where.channel = channel;
    if (status) where.status = status;
    
    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
        { contact: { email: { contains: search, mode: 'insensitive' } } },
        { contact: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        contact: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.message.count({ where });

    return NextResponse.json({
      messages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// Send a new message
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { auth } = await import('@/lib/auth');
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = sendMessageSchema.parse(body);

    // Get contact details and verify it belongs to user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    const contact = await prisma.contact.findFirst({
      where: { 
        id: validated.contactId,
        teamId: user?.teamId || null,
      }
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Determine recipient based on channel
    let recipient = '';
    switch (validated.channel) {
      case 'SMS':
      case 'WHATSAPP':
        recipient = contact.phone || '';
        break;
      case 'EMAIL':
        recipient = contact.email || '';
        break;
      case 'TWITTER':
        recipient = contact.twitterHandle || '';
        break;
      case 'FACEBOOK':
        recipient = contact.facebookId || '';
        break;
    }

    if (!recipient) {
      return NextResponse.json(
        { error: `No ${validated.channel} contact info available` },
        { status: 400 }
      );
    }

    // Send message
    const message = await sendMessage(validated.channel as MessageChannel, {
      to: recipient,
      body: validated.content,
      mediaUrl: validated.mediaUrls,
      contactId: validated.contactId,
      userId: validated.userId || session.user.id,
      scheduledFor: validated.scheduledFor ? new Date(validated.scheduledFor) : undefined,
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Send message error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}