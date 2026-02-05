/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const signupSchema = z.object({
  userId: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email("Invalid email address"),
  password: z.string().optional(),
  teamName: z.string().optional(),
  teamId: z.string().optional(),
  teamCode: z.string().optional(),
});

// Enhanced signup endpoint that creates user and assigns to team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = signupSchema.parse(body);

    // If userId is not provided, name and password are required
    if (!validated.userId) {
      if (!validated.name || validated.name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Name is required' },
          { status: 400 }
        );
      }
      if (!validated.password || validated.password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 }
        );
      }
    }

    // Check if user already exists (only if userId not provided - user already created via Better Auth)
    if (!validated.userId) {
      const existing = await prisma.user.findUnique({
        where: { email: validated.email }
      });

      if (existing) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Handle team creation/assignment
    let teamId = validated.teamId;
    let userRole: 'ADMIN' | 'EDITOR' | 'VIEWER' = 'EDITOR';

    if (validated.teamCode) {
      // Validate team code and get team info
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
          { error: 'Invalid team code' },
          { status: 404 }
        );
      }

      // Check if invite has expired
      if (invite.expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'This team code has expired' },
          { status: 410 }
        );
      }

      // Check if invite has already been accepted
      if (invite.acceptedAt) {
        return NextResponse.json(
          { error: 'This team code has already been used' },
          { status: 409 }
        );
      }

      // Check if email matches the invite email
      if (invite.email.toLowerCase() !== validated.email.toLowerCase()) {
        return NextResponse.json(
          { error: 'This team code is not valid for this email address' },
          { status: 403 }
        );
      }

      teamId = invite.team.id;
      userRole = invite.role;

      // Mark invite as accepted
      await prisma.teamInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
    } else if (validated.teamName && !teamId) {
      // Create new team if teamName provided
      const team = await prisma.team.create({
        data: {
          name: validated.teamName,
        }
      });
      teamId = team.id;
      userRole = 'ADMIN'; // First user in a team is admin
    } else if (validated.teamId) {
      // Verify team exists
      const team = await prisma.team.findUnique({
        where: { id: validated.teamId }
      });
      if (!team) {
        return NextResponse.json(
          { error: 'Team not found' },
          { status: 404 }
        );
      }
      teamId = team.id;
    }

    // Update user with team info if userId provided (user already created by Better Auth)
    if (teamId && validated.userId) {
      await prisma.user.update({
        where: { id: validated.userId },
        data: { 
          teamId,
          role: userRole,
        }
      });
    }

    return NextResponse.json({
      success: true,
      teamId,
    }, { status: 200 });
  } catch (error) {
    console.error('Signup error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}

