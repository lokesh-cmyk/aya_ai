/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { canAccessSpace } from '@/lib/permissions';

const addMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional().default('EDITOR'),
});

// Get space members
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
    const members = await prisma.spaceMember.findMany({
      where: { spaceId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// Add member to space
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
    const validated = addMemberSchema.parse(body);

    // Check permission - Team admins have full access, space admins can add members
    const { allowed, isTeamAdmin } = await canAccessSpace(session.user.id, id, 'ADMIN');
    
    if (!allowed && !isTeamAdmin) {
      return NextResponse.json(
        { error: 'Only admins can add members' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existing = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: id,
          userId: validated.userId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'User is already a member' },
        { status: 409 }
      );
    }

    const member = await prisma.spaceMember.create({
      data: {
        spaceId: id,
        userId: validated.userId,
        role: validated.role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error('Add member error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    );
  }
}

// Remove member from space
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check permission - Team admins have full access, space admins can remove members
    const { allowed, isTeamAdmin } = await canAccessSpace(session.user.id, id, 'ADMIN');
    
    if (!allowed && !isTeamAdmin) {
      return NextResponse.json(
        { error: 'Only admins can remove members' },
        { status: 403 }
      );
    }

    // Prevent removing yourself if you're the only admin
    if (userId === session.user.id) {
      const members = await prisma.spaceMember.findMany({
        where: { spaceId: id },
      });
      
      const adminCount = members.filter(m => m.role === 'ADMIN').length;
      if (adminCount === 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last admin from the space' },
          { status: 400 }
        );
      }
    }

    await prisma.spaceMember.delete({
      where: {
        spaceId_userId: {
          spaceId: id,
          userId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
