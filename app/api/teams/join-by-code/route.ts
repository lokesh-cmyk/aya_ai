import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { notifyMemberAdded } from '@/lib/notifications';

const joinByCodeSchema = z.object({
  teamCode: z.string().min(1, 'Team code is required'),
});

// POST /api/teams/join-by-code
// For authenticated OAuth users to join team using team code
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = joinByCodeSchema.parse(body);

    // Find the invitation by team code
    const invite = await prisma.teamInvite.findUnique({
      where: { teamCode: validated.teamCode },
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
        { error: 'This team code is not valid' },
        { status: 404 }
      );
    }

    // Check if invite has been accepted
    if (invite.acceptedAt) {
      return NextResponse.json(
        { error: 'This team code has already been used' },
        { status: 409 }
      );
    }

    // Check if invite has expired
    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: 'This team code has expired. Please ask for a new invite.' },
        { status: 410 }
      );
    }

    // Check if email matches
    if (invite.email.toLowerCase() !== session.user.email?.toLowerCase()) {
      return NextResponse.json(
        {
          error: `This invite was sent to ${invite.email}. You're signed in as ${session.user.email}.`,
          inviteEmail: invite.email,
          userEmail: session.user.email,
        },
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
        onboardingCompleted: true, // Mark onboarding as complete
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
      console.warn('[JoinByCodeAPI] Notification failed:', notifyError);
    }

    return NextResponse.json({
      success: true,
      message: `You have successfully joined ${invite.team.name}`,
      team: {
        id: invite.team.id,
        name: invite.team.name,
      },
      role: invite.role,
    });
  } catch (error) {
    console.error('Join by code error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to join team' },
      { status: 500 }
    );
  }
}
