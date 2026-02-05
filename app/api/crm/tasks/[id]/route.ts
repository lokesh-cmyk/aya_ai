/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { TaskPriority } from '@/app/generated/prisma/enums';
import { canAccessSpace } from '@/lib/permissions';
import { notifyTaskAssigned, notifyTaskStatusChanged, notifyTaskCompleted } from '@/lib/notifications';

const updateTaskSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  statusId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  progress: z.number().min(0).max(100).optional(),
  complexity: z.number().min(1).max(5).optional(),
  dueDate: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

// Get task by ID
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
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        creator: {
          select: { id: true, name: true, email: true, image: true },
        },
        status: true,
        taskList: {
          include: {
            space: true,
            statuses: {
              orderBy: { order: 'asc' },
            },
          },
        },
        comments: {
          where: { parentId: null }, // Only top-level comments
          include: {
            author: {
              select: { id: true, name: true, email: true, image: true },
            },
            replies: {
              include: {
                author: {
                  select: { id: true, name: true, email: true, image: true },
                },
                reactions: {
                  include: {
                    user: { select: { id: true, name: true, image: true } },
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
            reactions: {
              include: {
                user: { select: { id: true, name: true, image: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        watchers: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Transform task to include watch status and reaction counts
    const isWatching = task.watchers.some(w => w.userId === session.user.id);
    const watcherCount = task.watchers.length;

    // Transform comments to include reaction counts
    const transformedComments = task.comments.map((comment: any) => {
      const likes = comment.reactions?.filter((r: any) => r.type === 'like') || [];
      const dislikes = comment.reactions?.filter((r: any) => r.type === 'dislike') || [];
      const userReaction = comment.reactions?.find((r: any) => r.userId === session.user.id);

      return {
        ...comment,
        _count: {
          likes: likes.length,
          dislikes: dislikes.length,
        },
        userReaction: userReaction?.type || null,
        replies: comment.replies?.map((reply: any) => {
          const replyLikes = reply.reactions?.filter((r: any) => r.type === 'like') || [];
          const replyDislikes = reply.reactions?.filter((r: any) => r.type === 'dislike') || [];
          const replyUserReaction = reply.reactions?.find((r: any) => r.userId === session.user.id);
          return {
            ...reply,
            _count: {
              likes: replyLikes.length,
              dislikes: replyDislikes.length,
            },
            userReaction: replyUserReaction?.type || null,
          };
        }),
      };
    });

    const taskWithMeta = {
      ...task,
      comments: transformedComments,
      isWatching,
      watcherCount,
    };

    return NextResponse.json({ task: taskWithMeta });
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// Update task
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
    const validated = updateTaskSchema.parse(body);

    // Get task and check permission
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        taskList: {
          include: {
            space: {
              select: { id: true, teamId: true },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!task.taskList.spaceId) {
      return NextResponse.json({ error: 'Task has no associated space' }, { status: 400 });
    }

    // Check permission - Team admins have full access
    const { allowed } = await canAccessSpace(session.user.id, task.taskList.spaceId, 'EDITOR');

    if (!allowed) {
      return NextResponse.json(
        { error: 'You do not have permission to update this task' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.statusId !== undefined) updateData.statusId = validated.statusId;
    if (validated.assigneeId !== undefined) updateData.assigneeId = validated.assigneeId;
    if (validated.priority !== undefined) updateData.priority = validated.priority;
    if (validated.progress !== undefined) updateData.progress = validated.progress;
    if (validated.complexity !== undefined) updateData.complexity = validated.complexity;
    if (validated.dueDate !== undefined) {
      updateData.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
    }
    if (validated.tags !== undefined) updateData.tags = validated.tags;

    // Track changes for notifications
    const oldAssigneeId = task.assigneeId;
    const oldStatusId = task.statusId;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        creator: {
          select: { id: true, name: true, email: true, image: true },
        },
        status: true,
        comments: {
          include: {
            author: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    // Send notifications for changes
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true },
      });
      const changedByName = currentUser?.name || currentUser?.email || 'Someone';

      // Notify new assignee if assignee changed
      if (validated.assigneeId && validated.assigneeId !== oldAssigneeId && validated.assigneeId !== session.user.id) {
        await notifyTaskAssigned({
          assigneeId: validated.assigneeId,
          taskTitle: updatedTask.name,
          taskId: updatedTask.id,
          assignedByName: changedByName,
        });
      }

      // Notify team if status changed
      if (validated.statusId !== undefined && validated.statusId !== oldStatusId && task.taskList.space?.teamId) {
        // Get old and new status names
        const oldStatus = oldStatusId
          ? await prisma.taskStatusColumn.findUnique({ where: { id: oldStatusId }, select: { name: true } })
          : null;
        const newStatus = validated.statusId
          ? await prisma.taskStatusColumn.findUnique({ where: { id: validated.statusId }, select: { name: true } })
          : null;

        const oldStatusName = oldStatus?.name || 'No Status';
        const newStatusName = newStatus?.name || 'No Status';

        // Check if this is a completion (status name contains 'done', 'complete', 'finished')
        const isCompleted = newStatusName.toLowerCase().match(/done|complete|finished/);

        if (isCompleted) {
          await notifyTaskCompleted({
            teamId: task.taskList.space.teamId,
            taskTitle: updatedTask.name,
            taskId: updatedTask.id,
            completedByName: changedByName,
            completedById: session.user.id,
          });
        } else {
          await notifyTaskStatusChanged({
            teamId: task.taskList.space.teamId,
            taskTitle: updatedTask.name,
            taskId: updatedTask.id,
            oldStatus: oldStatusName,
            newStatus: newStatusName,
            changedByName,
            changedById: session.user.id,
          });
        }
      }
    } catch (notifyError) {
      console.warn('[TaskAPI] Notification failed:', notifyError);
    }

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error('Update task error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// Delete task
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
    // Get task and check permission
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        taskList: {
          include: {
            space: {
              select: { id: true, teamId: true },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!task.taskList.spaceId) {
      return NextResponse.json({ error: 'Task has no associated space' }, { status: 400 });
    }

    // Check permission - Team admins have full access
    const { allowed: allowedDelete } = await canAccessSpace(session.user.id, task.taskList.spaceId, 'EDITOR');

    if (!allowedDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this task' },
        { status: 403 }
      );
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
