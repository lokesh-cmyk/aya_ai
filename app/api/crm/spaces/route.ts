/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { notifySpaceCreated } from '@/lib/notifications';

const createSpaceSchema = z.object({
  name: z.string().min(1, 'Space name is required'),
  description: z.string().optional(),
  color: z.string().optional(),
});

// Get all spaces for user's team
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const search = searchParams.get('search');

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    const where: any = {
      teamId: teamId || user?.teamId || undefined,
      isArchived: false,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const spaces = await prisma.space.findMany({
      where,
      include: {
        creator: {
          select: { id: true, name: true, email: true, image: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        folders: {
          orderBy: { order: 'asc' },
          include: {
            taskLists: {
              include: {
                _count: { select: { tasks: true } },
              },
            },
          },
        },
        taskLists: {
          where: { folderId: null },
          orderBy: { order: 'asc' },
          include: {
            _count: { select: { tasks: true } },
          },
        },
        _count: {
          select: {
            folders: true,
            taskLists: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ spaces });
  } catch (error) {
    console.error('Get spaces error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spaces' },
      { status: 500 }
    );
  }
}

// Create new space
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createSpaceSchema.parse(body);

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true, role: true },
    });

    if (!user?.teamId) {
      return NextResponse.json(
        { error: 'You must be part of a team to create spaces' },
        { status: 400 }
      );
    }

    // Check if user is admin or editor
    if (user.role === 'VIEWER') {
      return NextResponse.json(
        { error: 'Only admins and editors can create spaces' },
        { status: 403 }
      );
    }

    const space = await prisma.space.create({
      data: {
        name: validated.name,
        description: validated.description,
        color: validated.color,
        teamId: user.teamId,
        createdBy: session.user.id,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true, image: true },
        },
        _count: {
          select: {
            folders: true,
            taskLists: true,
          },
        },
      },
    });

    // Add creator as admin member
    await prisma.spaceMember.create({
      data: {
        spaceId: space.id,
        userId: session.user.id,
        role: 'ADMIN',
      },
    });

    // Send notification to team
    try {
      const creatorName = space.creator?.name || space.creator?.email || 'Someone';
      await notifySpaceCreated({
        teamId: user.teamId,
        spaceName: space.name,
        spaceId: space.id,
        createdByName: creatorName,
        createdById: session.user.id,
      });
    } catch (notifyError) {
      console.warn('[SpaceAPI] Notification failed:', notifyError);
    }

    return NextResponse.json({ space }, { status: 201 });
  } catch (error) {
    console.error('Create space error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create space' },
      { status: 500 }
    );
  }
}
