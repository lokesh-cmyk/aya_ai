/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { TaskListType } from '@/app/generated/prisma/enums';
import { canAccessSpace } from '@/lib/permissions';

const createTaskListSchema = z.object({
  name: z.string().min(1, 'Task list name is required'),
  type: z.nativeEnum(TaskListType),
  description: z.string().optional(),
  spaceId: z.string().optional(),
  folderId: z.string().optional(),
  order: z.number().optional(),
});

// Create task list
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createTaskListSchema.parse(body);

    // Determine spaceId
    let spaceId = validated.spaceId;
    if (validated.folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: validated.folderId },
        select: { spaceId: true },
      });
      if (!folder) {
        return NextResponse.json(
          { error: 'Folder not found' },
          { status: 404 }
        );
      }
      spaceId = folder.spaceId;
    }

    if (!spaceId) {
      return NextResponse.json(
        { error: 'Space ID is required' },
        { status: 400 }
      );
    }

    // Check permission - Team admins have full access
    const { allowed } = await canAccessSpace(session.user.id, spaceId, 'EDITOR');
    
    if (!allowed) {
      return NextResponse.json(
        { error: 'You do not have permission to create task lists' },
        { status: 403 }
      );
    }

    // Create task list
    const taskList = await prisma.taskList.create({
      data: {
        name: validated.name,
        type: validated.type,
        description: validated.description,
        spaceId,
        folderId: validated.folderId || null,
        order: validated.order || 0,
      },
      include: {
        statuses: {
          orderBy: { order: 'asc' },
        },
        _count: { select: { tasks: true } },
      },
    });

    // Create default status columns based on type
    const defaultStatuses = getDefaultStatuses(validated.type);
    for (const [index, status] of defaultStatuses.entries()) {
      await prisma.taskStatusColumn.create({
        data: {
          name: status.name,
          color: status.color,
          order: index,
          taskListId: taskList.id,
        },
      });
    }

    // Reload with statuses
    const taskListWithStatuses = await prisma.taskList.findUnique({
      where: { id: taskList.id },
      include: {
        statuses: {
          orderBy: { order: 'asc' },
        },
        _count: { select: { tasks: true } },
      },
    });

    return NextResponse.json({ taskList: taskListWithStatuses }, { status: 201 });
  } catch (error) {
    console.error('Create task list error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create task list' },
      { status: 500 }
    );
  }
}

function getDefaultStatuses(type: TaskListType) {
  if (type === 'DEV_ROADMAP') {
    return [
      { name: 'NEED RESOLVING', color: '#ef4444' },
      { name: 'READY', color: '#3b82f6' },
      { name: 'ONGOING', color: '#f59e0b' },
      { name: 'OPEN', color: '#6b7280' },
      { name: 'DONE', color: '#10b981' },
    ];
  } else {
    // BUG_TRACKING
    return [
      { name: 'OPEN', color: '#6b7280' },
      { name: 'IMPROVEMENT', color: '#8b5cf6' },
      { name: 'NOT A BUG', color: '#f59e0b' },
      { name: 'CLOSED', color: '#10b981' },
    ];
  }
}
