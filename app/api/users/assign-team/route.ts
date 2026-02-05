/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const assignTeamSchema = z.object({
  userId: z.string(),
  teamId: z.string(),
});

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
    const validated = assignTeamSchema.parse(body);

    // Check if requester is admin of the team
    const requester = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, teamId: true },
    });

    if (!requester || requester.role !== 'ADMIN' || requester.teamId !== validated.teamId) {
      return NextResponse.json(
        { error: 'Only admins can assign users to teams' },
        { status: 403 }
      );
    }

    // Check if team has any users - first user should be ADMIN
    const teamUserCount = await prisma.user.count({
      where: { teamId: validated.teamId },
    });

    // Determine role: ADMIN if first user, otherwise keep existing role or default to EDITOR
    const existingUser = await prisma.user.findUnique({
      where: { id: validated.userId },
      select: { role: true },
    });

    const userRole = teamUserCount === 0 ? 'ADMIN' : (existingUser?.role || 'EDITOR');

    const user = await prisma.user.update({
      where: { id: validated.userId },
      data: {
        teamId: validated.teamId,
        role: userRole, // Set as ADMIN if first user in team
      },
    });

    console.log(`[assign-team] Assigned user ${validated.userId} to team ${validated.teamId} as ${userRole}`);

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Assign team error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to assign team' },
      { status: 500 }
    );
  }
}

