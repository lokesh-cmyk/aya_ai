/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { canAccessSpace } from '@/lib/permissions';

const updateFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').optional(),
  description: z.string().optional(),
  order: z.number().optional(),
});

// Get folder by ID
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
    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        taskLists: {
          include: {
            statuses: { orderBy: { order: 'asc' } },
            _count: { select: { tasks: true } },
          },
          orderBy: { order: 'asc' },
        },
        space: {
          select: { id: true, name: true, teamId: true },
        },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Check permission
    const { allowed } = await canAccessSpace(session.user.id, folder.spaceId, 'VIEWER');
    if (!allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ folder });
  } catch (error) {
    console.error('Get folder error:', error);
    return NextResponse.json({ error: 'Failed to fetch folder' }, { status: 500 });
  }
}

// Update folder
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
    const folder = await prisma.folder.findUnique({
      where: { id },
      select: { id: true, spaceId: true },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Check permission
    const { allowed } = await canAccessSpace(session.user.id, folder.spaceId, 'EDITOR');
    if (!allowed) {
      return NextResponse.json({ error: 'You do not have permission to edit this folder' }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateFolderSchema.parse(body);

    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: validated,
      include: {
        taskLists: {
          include: {
            statuses: { orderBy: { order: 'asc' } },
            _count: { select: { tasks: true } },
          },
          orderBy: { order: 'asc' },
        },
        space: {
          select: { id: true, name: true, teamId: true },
        },
      },
    });

    return NextResponse.json({ folder: updatedFolder });
  } catch (error) {
    console.error('Update folder error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

// Delete folder
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
    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        taskLists: {
          include: {
            _count: { select: { tasks: true } },
          },
        },
        space: {
          select: { id: true, name: true, teamId: true },
        },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Check permission - require EDITOR role to delete
    const { allowed } = await canAccessSpace(session.user.id, folder.spaceId, 'EDITOR');
    if (!allowed) {
      return NextResponse.json({ error: 'You do not have permission to delete this folder' }, { status: 403 });
    }

    // Count total tasks in all lists within the folder
    const totalTasks = folder.taskLists.reduce((acc, list) => acc + list._count.tasks, 0);

    // Delete the folder (cascade will delete task lists and their tasks due to schema)
    await prisma.folder.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Folder "${folder.name}" deleted successfully`,
      deletedTaskLists: folder.taskLists.length,
      deletedTasks: totalTasks,
    });
  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
