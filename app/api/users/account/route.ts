import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user with team info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, teamId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user is in a team, check if they're the last admin
    if (user.teamId && user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: {
          teamId: user.teamId,
          role: 'ADMIN',
        },
      });

      const totalMembers = await prisma.user.count({
        where: { teamId: user.teamId },
      });

      // If they're the last admin but other members exist, block deletion
      if (adminCount === 1 && totalMembers > 1) {
        return NextResponse.json(
          { error: 'You are the only admin. Please transfer admin role to another member or delete the organization first.' },
          { status: 400 }
        );
      }
    }

    // Clean up relations that don't have onDelete: Cascade on the User side
    // These would cause foreign key constraint errors if not handled

    // 1. Nullify userId on messages (optional field)
    await prisma.message.updateMany({
      where: { userId },
      data: { userId: null },
    });

    // 2. Delete notes authored by this user (authorId is required, no cascade)
    await prisma.note.deleteMany({
      where: { authorId: userId },
    });

    // 3. Handle tasks created by this user (createdById is required, no cascade)
    // Reassign to another team admin if possible, otherwise delete
    if (user.teamId) {
      const anotherAdmin = await prisma.user.findFirst({
        where: {
          teamId: user.teamId,
          role: 'ADMIN',
          id: { not: userId },
        },
        select: { id: true },
      });

      if (anotherAdmin) {
        // Reassign tasks to another admin
        await prisma.task.updateMany({
          where: { createdById: userId },
          data: { createdById: anotherAdmin.id },
        });
      } else {
        // No other admin — delete tasks created by this user
        await prisma.task.deleteMany({
          where: { createdById: userId },
        });
      }
    } else {
      // No team — delete tasks created by this user
      await prisma.task.deleteMany({
        where: { createdById: userId },
      });
    }

    // Delete the user — cascade deletes handle:
    // Session, Account, SpaceMember, TaskComment, TeamChat, TeamChatRead,
    // Notification, AIChatConversation, MeetingBotSettings, SignalDismissal,
    // TaskWatcher, TaskCommentReaction, Meeting
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
