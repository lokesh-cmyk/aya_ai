/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { canAccessSpace } from '@/lib/permissions';

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  parentId: z.string().optional(),
});

// Get comments for a task
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
    const comments = await prisma.taskComment.findMany({
      where: {
        taskId: id,
        parentId: null, // Only top-level comments
      },
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
                user: {
                  select: { id: true, name: true, image: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        reactions: {
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Transform reactions into counts and user reaction
    const transformedComments = comments.map((comment: any) => {
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

    return NextResponse.json({ comments: transformedComments });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// Create comment
export async function POST(
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
    const validated = createCommentSchema.parse(body);

    // Verify task exists and user has access
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
    const { allowed } = await canAccessSpace(session.user.id, task.taskList.spaceId, 'VIEWER');
    
    if (!allowed) {
      return NextResponse.json(
        { error: 'You do not have access to this task' },
        { status: 403 }
      );
    }

    const comment = await prisma.taskComment.create({
      data: {
        content: validated.content,
        taskId: id,
        authorId: session.user.id,
        parentId: validated.parentId || null,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Create comment error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
