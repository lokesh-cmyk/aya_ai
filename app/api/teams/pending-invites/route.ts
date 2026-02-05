import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/teams/pending-invites
// Returns pending team invites for the authenticated user's email
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // Find pending invites for this email
    const invites = await prisma.teamInvite.findMany({
      where: {
        email: {
          equals: session.user.email,
          mode: 'insensitive',
        },
        acceptedAt: null, // Not yet accepted
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform to response format (don't expose sensitive fields like token)
    const pendingInvites = invites.map((invite) => ({
      id: invite.id,
      teamId: invite.team.id,
      teamName: invite.team.name,
      role: invite.role,
      expiresAt: invite.expiresAt,
      teamCode: invite.teamCode,
    }));

    return NextResponse.json({
      invites: pendingInvites,
    });
  } catch (error) {
    console.error('Get pending invites error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending invites' },
      { status: 500 }
    );
  }
}
