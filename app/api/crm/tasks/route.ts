/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { TaskPriority } from '@/app/generated/prisma/enums';
import { canAccessSpace } from '@/lib/permissions';
import { notifyTaskCreated, notifyTaskAssigned } from '@/lib/notifications';

const createTaskSchema = z.object({
  name: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  taskListId: z.string(),
  statusId: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  progress: z.number().min(0).max(100).optional(),
  complexity: z.number().min(1).max(5).optional(),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Get tasks
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskListId = searchParams.get('taskListId');
    const statusId = searchParams.get('statusId');
    const search = searchParams.get('search');

    const where: any = {};
    if (taskListId) where.taskListId = taskListId;
    if (statusId) where.statusId = statusId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        creator: {
          select: { id: true, name: true, email: true, image: true },
        },
        status: true,
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// Create task
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createTaskSchema.parse(body);

    // Get task list and check permission
    const taskList = await prisma.taskList.findUnique({
      where: { id: validated.taskListId },
      include: {
        space: {
          select: { id: true, teamId: true },
        },
      },
    });

    if (!taskList) {
      return NextResponse.json(
        { error: 'Task list not found' },
        { status: 404 }
      );
    }

    if (!taskList.spaceId) {
      return NextResponse.json(
        { error: 'Task list has no associated space' },
        { status: 400 }
      );
    }

    // Check permission - Team admins have full access
    const { allowed } = await canAccessSpace(session.user.id, taskList.spaceId, 'EDITOR');
    
    if (!allowed) {
      return NextResponse.json(
        { error: 'You do not have permission to create tasks' },
        { status: 403 }
      );
    }

    // Generate task ID (like "5bxr")
    const taskId = generateTaskId();

    const task = await prisma.task.create({
      data: {
        name: validated.name,
        description: validated.description,
        taskId,
        taskListId: validated.taskListId,
        statusId: validated.statusId || null,
        assigneeId: validated.assigneeId || null,
        priority: validated.priority || 'NORMAL',
        progress: validated.progress || 0,
        complexity: validated.complexity || null,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        tags: validated.tags || [],
        createdById: session.user.id,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        creator: {
          select: { id: true, name: true, email: true, image: true },
        },
        status: true,
        _count: { select: { comments: true } },
      },
    });

    // Send notifications
    try {
      const creatorName = task.creator?.name || task.creator?.email || 'Someone';

      // Notify team about new task
      if (taskList.space?.teamId) {
        await notifyTaskCreated({
          teamId: taskList.space.teamId,
          taskTitle: task.name,
          taskId: task.id,
          createdByName: creatorName,
          createdById: session.user.id,
          spaceId: taskList.spaceId,
        });
      }

      // Notify assignee if task is assigned
      if (validated.assigneeId && validated.assigneeId !== session.user.id) {
        await notifyTaskAssigned({
          assigneeId: validated.assigneeId,
          taskTitle: task.name,
          taskId: task.id,
          assignedByName: creatorName,
        });
      }
    } catch (notifyError) {
      console.warn('[TaskAPI] Notification failed:', notifyError);
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

function generateTaskId(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
