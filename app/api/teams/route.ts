/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  userId: z.string().optional(), // Optional: if provided, user will be assigned as ADMIN
});

// Get current user's team (or all teams for admin purposes)
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { auth } = await import('@/lib/auth');
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's teamId
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    // If user has a team, return only their team
    if (currentUser?.teamId) {
      const team = await prisma.team.findUnique({
        where: { id: currentUser.teamId },
        include: {
          _count: {
            select: {
              users: true,
              contacts: true,
            }
          }
        }
      });

      return NextResponse.json({
        teams: team ? [team] : [],
        pagination: {
          total: team ? 1 : 0,
          limit: 1,
          offset: 0,
          hasMore: false,
        }
      });
    }

    // User has no team - return empty
    return NextResponse.json({
      teams: [],
      pagination: {
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      }
    });
  } catch (error) {
    console.error('Get teams error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

// Create new team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createTeamSchema.parse(body);

    // Get authenticated user if available (for onboarding flow)
    const { auth } = await import('@/lib/auth');
    let userId: string | undefined;
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });
      userId = session?.user?.id;
    } catch {
      // Not authenticated - that's okay, userId might be in body
    }

    // Check if team already exists
    const existing = await prisma.team.findFirst({
      where: {
        name: {
          equals: validated.name,
          mode: 'insensitive',
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Team with this name already exists', team: existing },
        { status: 409 }
      );
    }

    // Create team
    const team = await prisma.team.create({
      data: {
        name: validated.name,
      },
      include: {
        _count: {
          select: {
            users: true,
            contacts: true,
          }
        }
      }
    });

    // If userId is provided (from body or session), assign user to team as ADMIN
    const userIdToAssign = (body as any).userId || userId;
    if (userIdToAssign) {
      await prisma.user.update({
        where: { id: userIdToAssign },
        data: {
          teamId: team.id,
          role: 'ADMIN', // First user in a team is always ADMIN
          onboardingCompleted: true, // Mark onboarding as complete
        },
      });
      console.log(`[teams] Assigned user ${userIdToAssign} to team ${team.id} as ADMIN`);
    }

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error('Create team error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}

