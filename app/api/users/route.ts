/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  teamId: z.string().optional(),
  teamName: z.string().optional(),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional(),
});

// Get team members (filtered by current user's team)
export async function GET(request: NextRequest) {
  try {
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

    if (!currentUser?.teamId) {
      // User has no team, return empty array
      return NextResponse.json({
        users: [],
        pagination: {
          total: 0,
          limit: 50,
          offset: 0,
          hasMore: false,
        }
      });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Only return users from the current user's team
    const where: any = {
      teamId: currentUser.teamId,
    };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.user.count({ where });

    // Auto-promote first user to ADMIN if they're the only member and not already ADMIN
    // This handles cases where team creator wasn't properly set as ADMIN
    if (total === 1 && users.length === 1 && users[0].id === session.user.id && users[0].role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { role: 'ADMIN' },
      });
      users[0].role = 'ADMIN';
      console.log(`[users] Auto-promoted sole team member ${session.user.id} to ADMIN`);
    }

    return NextResponse.json({
      users,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// Create new user (helper endpoint - Better Auth handles actual creation)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createUserSchema.parse(body);

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: validated.email }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Handle team creation/assignment
    let teamId = validated.teamId;
    if (validated.teamName && !teamId) {
      // Create new team if teamName provided
      const team = await prisma.team.create({
        data: {
          name: validated.teamName,
        }
      });
      teamId = team.id;
    }

    // Note: Better Auth will create the user, this is just for team assignment
    // The actual user creation happens through Better Auth signup
    return NextResponse.json({
      message: 'User creation should be done through Better Auth signup endpoint',
      teamId,
    }, { status: 200 });
  } catch (error) {
    console.error('Create user error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process user creation' },
      { status: 500 }
    );
  }
}

