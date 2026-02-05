/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { sendInviteEmail } from '@/lib/emails/invite';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional().default('EDITOR'),
});

// Send team invitation
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validated = inviteSchema.parse(body);

    // Get user's team and name
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true, role: true, name: true, email: true },
    });

    if (!user?.teamId) {
      return NextResponse.json(
        { error: 'You must be part of a team to send invitations' },
        { status: 400 }
      );
    }

    // Only admins can send invitations
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can send invitations' },
        { status: 403 }
      );
    }

    // Check if user with this email already exists in the team
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
      select: { id: true, teamId: true },
    });

    if (existingUser?.teamId === user.teamId) {
      return NextResponse.json(
        { error: 'User is already a member of this team' },
        { status: 409 }
      );
    }

    // Check if there's already a pending invite for this email and team
    const existingInvite = await prisma.teamInvite.findFirst({
      where: {
        email: validated.email,
        teamId: user.teamId,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 409 }
      );
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex');

    // Generate team code (6 characters, alphanumeric, uppercase)
    const generateTeamCode = (): string => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar looking chars (0, O, I, 1)
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let teamCode = generateTeamCode();
    // Ensure uniqueness
    let existingCode = await prisma.teamInvite.findUnique({
      where: { teamCode },
    });
    while (existingCode) {
      teamCode = generateTeamCode();
      existingCode = await prisma.teamInvite.findUnique({
        where: { teamCode },
      });
    }

    // Create invitation (expires in 3 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);

    const invite = await prisma.teamInvite.create({
      data: {
        email: validated.email,
        teamId: user.teamId,
        invitedBy: session.user.id,
        role: validated.role,
        token,
        teamCode,
        expiresAt,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Generate invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;

    // Send invitation email
    try {
      await sendInviteEmail({
        to: validated.email,
        teamName: invite.team.name,
        inviteUrl,
        teamCode,
        role: validated.role,
        inviterName: user.name || undefined,
        expiresAt,
      });

      return NextResponse.json({
        success: true,
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt,
        },
        message: `Invitation email sent to ${validated.email}.`,
      }, { status: 201 });
    } catch (emailError: any) {
      // Log email error but don't fail the invite creation
      // The invite is still valid and can be shared manually
      console.error('Failed to send invitation email:', emailError);

      return NextResponse.json({
        success: true,
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt,
          inviteUrl, // Include URL as fallback if email fails
        },
        message: `Invitation created, but email delivery failed. Share this link manually: ${inviteUrl}`,
        warning: 'Email delivery failed. You may need to share the invitation link manually.',
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Create invite error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
