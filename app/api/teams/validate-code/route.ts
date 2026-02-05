/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const validateCodeSchema = z.object({
  teamCode: z.string().min(1, 'Team code is required'),
});

// Validate team code endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateCodeSchema.parse(body);

    // Find invite by team code
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

    return NextResponse.json({
      valid: true,
      teamName: invite.team.name,
      role: invite.role,
      expiresAt: invite.expiresAt,
    }, { status: 200 });
  } catch (error) {
    console.error('Validate team code error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to validate team code' },
      { status: 500 }
    );
  }
}
