/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { canAccessSpace } from '@/lib/permissions';
import { notifyFolderCreated } from '@/lib/notifications';

const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required'),
  description: z.string().optional(),
  spaceId: z.string(),
  order: z.number().optional(),
});

// Create folder
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createFolderSchema.parse(body);

    // Check permission - Team admins have full access
    const { allowed } = await canAccessSpace(session.user.id, validated.spaceId, 'EDITOR');
    
    if (!allowed) {
      return NextResponse.json(
        { error: 'You do not have permission to create folders' },
        { status: 403 }
      );
    }

    const folder = await prisma.folder.create({
      data: {
        name: validated.name,
        description: validated.description,
        spaceId: validated.spaceId,
        order: validated.order || 0,
      },
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

    // Send notification to team
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true },
      });
      const creatorName = currentUser?.name || currentUser?.email || 'Someone';

      if (folder.space?.teamId) {
        await notifyFolderCreated({
          teamId: folder.space.teamId,
          folderName: folder.name,
          folderId: folder.id,
          spaceName: folder.space.name,
          spaceId: folder.space.id,
          createdByName: creatorName,
          createdById: session.user.id,
        });
      }
    } catch (notifyError) {
      console.warn('[FolderAPI] Notification failed:', notifyError);
    }

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    console.error('Create folder error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
