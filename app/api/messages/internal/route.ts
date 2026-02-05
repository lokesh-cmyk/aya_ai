/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { MessageChannel, MessageDirection, MessageStatus } from '@/app/generated/prisma/enums';
import { z } from 'zod';

const sendInternalMessageSchema = z.object({
  recipientId: z.string().optional(), // User ID of the recipient
  recipientEmail: z.string().email().optional(), // Email of the recipient (alternative to recipientId)
  content: z.string().min(1),
  mediaUrls: z.array(z.string()).optional(),
});

/**
 * Send an internal message to a team member
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("better-auth.session_token");
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
    const validated = sendInternalMessageSchema.parse(body);

    if (!validated.recipientId && !validated.recipientEmail) {
      return NextResponse.json(
        { error: 'Either recipientId or recipientEmail is required' },
        { status: 400 }
      );
    }

    // Get sender's team
    const sender = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true, email: true, name: true },
    });

    if (!sender?.teamId) {
      return NextResponse.json(
        { error: 'User must be part of a team' },
        { status: 400 }
      );
    }

    // Get recipient and verify they're in the same team
    let recipient;
    if (validated.recipientId) {
      recipient = await prisma.user.findUnique({
        where: { id: validated.recipientId },
        select: { teamId: true, email: true, name: true, id: true },
      });
    } else if (validated.recipientEmail) {
      recipient = await prisma.user.findFirst({
        where: { 
          email: validated.recipientEmail,
          teamId: sender.teamId,
        },
        select: { teamId: true, email: true, name: true, id: true },
      });
    }

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      );
    }

    if (recipient.teamId !== sender.teamId) {
      return NextResponse.json(
        { error: 'Recipient is not in the same team' },
        { status: 403 }
      );
    }

    // Find or create contact for recipient
    let recipientContact = await prisma.contact.findFirst({
      where: {
        email: recipient.email,
        teamId: sender.teamId,
      },
    });

    if (!recipientContact) {
      recipientContact = await prisma.contact.create({
        data: {
          email: recipient.email,
          name: recipient.name || recipient.email.split('@')[0],
          teamId: sender.teamId,
          tags: ['internal', 'team-member'],
        },
      });
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content: validated.content,
        channel: MessageChannel.EMAIL, // Using EMAIL channel for internal messages
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.DELIVERED,
        contactId: recipientContact.id,
        userId: session.user.id,
        sentAt: new Date(),
        metadata: {
          isInternal: true,
          recipientId: recipient.id,
          recipientName: recipient.name || recipient.email,
        },
        mediaUrls: validated.mediaUrls || [],
      },
      include: {
        contact: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Also create an inbound message for the recipient's view
    // Find or create contact for sender
    let senderContact = await prisma.contact.findFirst({
      where: {
        email: sender.email,
        teamId: sender.teamId,
      },
    });

    if (!senderContact) {
      senderContact = await prisma.contact.create({
        data: {
          email: sender.email,
          name: sender.name || sender.email.split('@')[0],
          teamId: sender.teamId,
          tags: ['internal', 'team-member'],
        },
      });
    }

    // Create inbound message for recipient
    await prisma.message.create({
      data: {
        content: validated.content,
        channel: MessageChannel.EMAIL,
        direction: MessageDirection.INBOUND,
        status: MessageStatus.DELIVERED,
        contactId: senderContact.id,
        userId: recipient.id,
        sentAt: new Date(),
        metadata: {
          isInternal: true,
          senderId: session.user.id,
          senderName: sender.name || sender.email,
          relatedMessageId: message.id,
        },
        mediaUrls: validated.mediaUrls || [],
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error: any) {
    console.error('Send internal message error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to send internal message' },
      { status: 500 }
    );
  }
}

/**
 * Get internal messages (conversations with team members)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("better-auth.session_token");
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
      select: { teamId: true, email: true },
    });

    if (!user?.teamId) {
      return NextResponse.json(
        { error: 'User must be part of a team' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId'); // For fetching messages for a specific contact

    // Get all team members
    const teamMembers = await prisma.user.findMany({
      where: {
        teamId: user.teamId,
        id: { not: session.user.id }, // Exclude self
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Get contacts for team members
    const teamMemberContacts = await prisma.contact.findMany({
      where: {
        teamId: user.teamId,
        email: { in: teamMembers.map(m => m.email) },
        tags: { has: 'internal' },
        ...(contactId ? { id: contactId } : {}),
      },
      include: {
        messages: {
          where: contactId ? {
            OR: [
              { userId: session.user.id },
              { metadata: { path: ['isInternal'], equals: true } },
            ],
          } : undefined,
          orderBy: {
            createdAt: 'desc',
          },
          ...(contactId ? { take: 50 } : { take: 1 }),
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return NextResponse.json({
      contacts: teamMemberContacts,
      teamMembers,
    });
  } catch (error: any) {
    console.error('Get internal messages error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch internal messages' },
      { status: 500 }
    );
  }
}
