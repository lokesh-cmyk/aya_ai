/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { canAccessSpace } from '@/lib/permissions';

const updateTaskListSchema = z.object({
  name: z.string().min(1, 'Task list name is required').optional(),
  description: z.string().optional(),
  order: z.number().optional(),
});

// Get task list by ID
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
    const taskList = await prisma.taskList.findUnique({
      where: { id },
      include: {
        statuses: {
          orderBy: { order: 'asc' },
        },
        space: {
          include: {
            members: {
              where: { userId: session.user.id },
            },
          },
        },
        folder: true,
      },
    });

    if (!taskList) {
      return NextResponse.json(
        { error: 'Task list not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ taskList });
  } catch (error) {
    console.error('Get task list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task list' },
      { status: 500 }
    );
  }
}

// Update task list
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
    const taskList = await prisma.taskList.findUnique({
      where: { id },
      include: {
        space: { select: { id: true } },
      },
    });

    if (!taskList) {
      return NextResponse.json({ error: 'Task list not found' }, { status: 404 });
    }

    if (!taskList.spaceId) {
      return NextResponse.json({ error: 'Task list has no associated space' }, { status: 400 });
    }

    // Check permission
    const { allowed } = await canAccessSpace(session.user.id, taskList.spaceId, 'EDITOR');
    if (!allowed) {
      return NextResponse.json({ error: 'You do not have permission to edit this task list' }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateTaskListSchema.parse(body);

    const updatedTaskList = await prisma.taskList.update({
      where: { id },
      data: validated,
      include: {
        statuses: { orderBy: { order: 'asc' } },
        _count: { select: { tasks: true } },
      },
    });

    return NextResponse.json({ taskList: updatedTaskList });
  } catch (error) {
    console.error('Update task list error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update task list' }, { status: 500 });
  }
}

// Delete task list
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
    const taskList = await prisma.taskList.findUnique({
      where: { id },
      include: {
        space: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
    });

    if (!taskList) {
      return NextResponse.json({ error: 'Task list not found' }, { status: 404 });
    }

    if (!taskList.spaceId) {
      return NextResponse.json({ error: 'Task list has no associated space' }, { status: 400 });
    }

    // Check permission - require EDITOR role to delete
    const { allowed } = await canAccessSpace(session.user.id, taskList.spaceId, 'EDITOR');
    if (!allowed) {
      return NextResponse.json({ error: 'You do not have permission to delete this task list' }, { status: 403 });
    }

    const taskCount = taskList._count.tasks;

    // Delete the task list (cascade will delete tasks due to schema)
    await prisma.taskList.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Task list "${taskList.name}" deleted successfully`,
      deletedTasks: taskCount,
    });
  } catch (error) {
    console.error('Delete task list error:', error);
    return NextResponse.json({ error: 'Failed to delete task list' }, { status: 500 });
  }
}
