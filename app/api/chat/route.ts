/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { notifyTeamChatMessage } from '@/lib/notifications';

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  type: z.enum(['text', 'file', 'audio', 'image']).default('text'),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  parentId: z.string().optional(),
});

// Get chat messages for team
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    if (!user?.teamId) {
      return NextResponse.json(
        { error: 'You must be part of a team to access chat' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const before = searchParams.get('before'); // For pagination

    const where: any = {
      teamId: user.teamId,
    };

    if (before) {
      where.createdAt = {
        lt: new Date(before),
      };
    }

    const messages = await prisma.teamChat.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        parent: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        readBy: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.teamChat.count({ where });

    // Mark messages as read for current user
    const unreadMessageIds = messages
      .filter(
        (msg) =>
          msg.senderId !== session.user.id &&
          !msg.readBy.some((read) => read.userId === session.user.id)
      )
      .map((msg) => msg.id);

    if (unreadMessageIds.length > 0) {
      await prisma.teamChatRead.createMany({
        data: unreadMessageIds.map((msgId) => ({
          chatId: msgId,
          userId: session.user.id,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat messages' },
      { status: 500 }
    );
  }
}

// Send a chat message
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    if (!user?.teamId) {
      return NextResponse.json(
        { error: 'You must be part of a team to send messages' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = sendMessageSchema.parse(body);

    const message = await prisma.teamChat.create({
      data: {
        content: validated.content,
        type: validated.type,
        fileUrl: validated.fileUrl || null,
        fileName: validated.fileName || null,
        fileSize: validated.fileSize || null,
        mimeType: validated.mimeType || null,
        teamId: user.teamId,
        senderId: session.user.id,
        parentId: validated.parentId || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        parent: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        readBy: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Mark as read by sender
    await prisma.teamChatRead.create({
      data: {
        chatId: message.id,
        userId: session.user.id,
      },
    });

    // Broadcast new message via WebSocket (if server is available)
    try {
      const { chatWebSocketServer } = await import('@/lib/websocket/chat-server');
      await chatWebSocketServer.broadcastNewMessage(user.teamId, {
        id: message.id,
        content: message.content,
        type: message.type,
        senderId: message.senderId,
        teamId: message.teamId,
        createdAt: message.createdAt,
        fileUrl: message.fileUrl || undefined,
        fileName: message.fileName || undefined,
      });
    } catch (wsError) {
      // WebSocket server might not be initialized - that's okay, polling will handle it
      console.warn('[ChatAPI] WebSocket broadcast failed (using polling fallback):', wsError);
    }

    // Send notifications to team members (except sender)
    try {
      await notifyTeamChatMessage({
        teamId: user.teamId,
        senderId: session.user.id,
        senderName: message.sender.name || message.sender.email,
        messagePreview: message.content,
      });
    } catch (notifyError) {
      console.warn('[ChatAPI] Notification failed:', notifyError);
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Send chat message error:', error);

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
