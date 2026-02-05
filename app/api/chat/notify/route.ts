import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyTeamChatMessage } from '@/lib/notifications';

// Trigger notification for Stream Chat messages
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messagePreview, channelId, channelName } = body;

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        teamId: true,
        name: true,
        email: true,
      },
    });

    if (!user?.teamId) {
      return NextResponse.json(
        { error: 'User not in a team' },
        { status: 400 }
      );
    }

    // Send notifications to team members (except sender)
    await notifyTeamChatMessage({
      teamId: user.teamId,
      senderId: session.user.id,
      senderName: user.name || user.email || 'Team member',
      messagePreview: messagePreview || 'New message',
      channelId,
      channelName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ChatNotifyAPI] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
