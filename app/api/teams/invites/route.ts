/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Get pending invites for a team
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Verify user is part of the team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true, role: true },
    });

    if (user?.teamId !== teamId || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized to view invites for this team' },
        { status: 403 }
      );
    }

    // Get pending invites
    const invites = await prisma.teamInvite.findMany({
      where: {
        teamId,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      invites,
    });
  } catch (error) {
    console.error('Get invites error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}
