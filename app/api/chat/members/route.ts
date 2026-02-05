/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Get team members for chat
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
        { error: 'You must be part of a team' },
        { status: 400 }
      );
    }

    const members = await prisma.user.findMany({
      where: {
        teamId: user.teamId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get unread message counts for each member
    const unreadCounts = await prisma.teamChat.groupBy({
      by: ['senderId'],
      where: {
        teamId: user.teamId,
        senderId: {
          not: session.user.id,
        },
        readBy: {
          none: {
            userId: session.user.id,
          },
        },
      },
      _count: {
        id: true,
      },
    });

    const unreadMap = new Map(
      unreadCounts.map((item) => [item.senderId, item._count.id])
    );

    const membersWithUnread = members.map((member) => ({
      ...member,
      unreadCount: unreadMap.get(member.id) || 0,
    }));

    return NextResponse.json({
      members: membersWithUnread,
      teamId: user.teamId, // Include teamId in response
    });
  } catch (error) {
    console.error('Get chat members error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
