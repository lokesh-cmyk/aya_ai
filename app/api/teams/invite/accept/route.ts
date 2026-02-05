/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { notifyMemberAdded } from '@/lib/notifications';

const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Invite token is required'),
});

// Accept team invitation
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to accept the invitation.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = acceptInviteSchema.parse(body);

    // Find the invitation
    const invite = await prisma.teamInvite.findUnique({
      where: { token: validated.token },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    if (invite.acceptedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 409 }
      );
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 }
      );
    }

    // Check if email matches
    if (invite.email !== session.user.email) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      );
    }

    // Check if user is already in a team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    if (user?.teamId && user.teamId !== invite.teamId) {
      return NextResponse.json(
        { error: 'You are already a member of another team. Please leave your current team first.' },
        { status: 409 }
      );
    }

    // Update user to join the team
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        teamId: invite.teamId,
        role: invite.role,
      },
      select: { name: true, email: true },
    });

    // Mark invitation as accepted
    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: {
        acceptedAt: new Date(),
      },
    });

    // Get inviter info for notification
    const inviter = await prisma.user.findUnique({
      where: { id: invite.invitedBy },
      select: { name: true, email: true },
    });

    // Send notification to team
    try {
      await notifyMemberAdded({
        teamId: invite.teamId,
        newMemberName: updatedUser.name || 'New member',
        newMemberEmail: updatedUser.email || session.user.email || '',
        addedByName: inviter?.name || inviter?.email || 'Someone',
        addedById: invite.invitedBy,
      });
    } catch (notifyError) {
      console.warn('[InviteAcceptAPI] Notification failed:', notifyError);
    }

    return NextResponse.json({
      success: true,
      message: `You have successfully joined ${invite.team.name}`,
      team: invite.team,
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}

// Get invite details by token (for preview before accepting)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    if (invite.acceptedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 409 }
      );
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      invite: {
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        team: invite.team,
      },
    });
  } catch (error) {
    console.error('Get invite error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}
