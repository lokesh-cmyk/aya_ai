/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { canAccessSpace } from '@/lib/permissions';

const updateSpaceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  isArchived: z.boolean().optional(),
});

// Get space by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const space = await prisma.space.findUnique({
      where: { id },
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
      },
    });

    if (!space) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    return NextResponse.json({ space });
  } catch (error) {
    console.error('Get space error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch space' },
      { status: 500 }
    );
  }
}

// Update space
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateSpaceSchema.parse(body);

    // Check permission - Team admins have full access
    const { allowed } = await canAccessSpace(session.user.id, id, 'EDITOR');
    
    if (!allowed) {
      return NextResponse.json(
        { error: 'You do not have permission to update this space' },
        { status: 403 }
      );
    }

    const space = await prisma.space.update({
      where: { id },
      data: validated,
      include: {
        creator: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({ space });
  } catch (error) {
    console.error('Update space error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update space' },
      { status: 500 }
    );
  }
}

// Delete space
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // Check permission - Team admins have full access, space admins can delete
    const { allowed, isTeamAdmin } = await canAccessSpace(session.user.id, id, 'ADMIN');
    
    if (!allowed && !isTeamAdmin) {
      return NextResponse.json(
        { error: 'Only admins can delete spaces' },
        { status: 403 }
      );
    }

    await prisma.space.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete space error:', error);
    return NextResponse.json(
      { error: 'Failed to delete space' },
      { status: 500 }
    );
  }
}
