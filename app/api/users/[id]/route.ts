/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { notifyMemberRemoved } from '@/lib/notifications';

// Remove team member (only ADMIN can remove members)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: userIdToRemove } = await params;

    // Get requester's role and team
    const requester = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, teamId: true },
    });

    if (!requester || !requester.teamId) {
      return NextResponse.json(
        { error: 'You must be part of a team' },
        { status: 403 }
      );
    }

    // Only admins can remove members
    if (requester.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can remove team members' },
        { status: 403 }
      );
    }

    // Get user to remove
    const userToRemove = await prisma.user.findUnique({
      where: { id: userIdToRemove },
      select: { id: true, teamId: true, role: true },
    });

    if (!userToRemove) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Ensure user is in the same team
    if (userToRemove.teamId !== requester.teamId) {
      return NextResponse.json(
        { error: 'User is not a member of your team' },
        { status: 403 }
      );
    }

    // Prevent removing yourself
    if (userToRemove.id === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from the team' },
        { status: 400 }
      );
    }

    // Prevent removing the last admin
    const adminCount = await prisma.user.count({
      where: {
        teamId: requester.teamId,
        role: 'ADMIN',
      },
    });

    if (userToRemove.role === 'ADMIN' && adminCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last admin. Please assign another admin first.' },
        { status: 400 }
      );
    }

    // Get the removed user's name before removing
    const removedMemberInfo = await prisma.user.findUnique({
      where: { id: userIdToRemove },
      select: { name: true, email: true },
    });

    // Remove user from team (set teamId to null)
    await prisma.user.update({
      where: { id: userIdToRemove },
      data: {
        teamId: null,
      },
    });

    // Get requester's name for notification
    const requesterInfo = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    // Send notification to team
    try {
      await notifyMemberRemoved({
        teamId: requester.teamId,
        removedMemberName: removedMemberInfo?.name || removedMemberInfo?.email || 'A member',
        removedById: session.user.id,
        removedByName: requesterInfo?.name || requesterInfo?.email || 'An admin',
      });
    } catch (notifyError) {
      console.warn('[UserAPI] Notification failed:', notifyError);
    }

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully',
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
