/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const updateTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        _count: {
          select: {
            users: true,
            contacts: true,
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error('Get team error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateTeamSchema.parse(body);

    const team = await prisma.team.update({
      where: { id },
      data: {
        name: validated.name,
      },
      include: {
        _count: {
          select: {
            users: true,
            contacts: true,
          }
        }
      }
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error('Update team error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the user belongs to this team and is an ADMIN
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, teamId: true },
    });

    if (!user || user.teamId !== id) {
      return NextResponse.json({ error: 'You are not a member of this organization' }, { status: 403 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete the organization' }, { status: 403 });
    }

    // Verify team exists
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Disconnect all users from the team before deleting
    await prisma.user.updateMany({
      where: { teamId: id },
      data: { teamId: null },
    });

    // Delete the team — cascade deletes handle related data
    // (TeamInvite, Space->SpaceMember/Folder/TaskList->Task, TeamChat, Contacts, etc.)
    await prisma.team.delete({ where: { id } });

    return NextResponse.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
}
