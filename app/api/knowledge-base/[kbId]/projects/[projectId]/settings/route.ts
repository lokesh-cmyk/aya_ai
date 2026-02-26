// app/api/knowledge-base/[kbId]/projects/[projectId]/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Fetch project KB settings (auto-save transcript config)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; projectId: string }> }
) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { auth } = await import('@/lib/auth');
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    if (!user?.teamId) {
      return NextResponse.json(
        { error: 'No team found' },
        { status: 404 }
      );
    }

    const { kbId, projectId } = await params;

    // Verify KB belongs to user's team
    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: kbId, teamId: user.teamId },
      select: { id: true },
    });

    if (!kb) {
      return NextResponse.json(
        { error: 'Knowledge base not found' },
        { status: 404 }
      );
    }

    // Fetch project settings for this KB
    const settings = await prisma.kBProjectSettings.findFirst({
      where: {
        knowledgeBaseId: kbId,
        projectId: projectId,
      },
      include: {
        transcriptFolder: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[KB Project Settings GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project settings' },
      { status: 500 }
    );
  }
}

// Update or create project KB settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; projectId: string }> }
) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { auth } = await import('@/lib/auth');
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    if (!user?.teamId) {
      return NextResponse.json(
        { error: 'No team found' },
        { status: 404 }
      );
    }

    const { kbId, projectId } = await params;

    // Verify KB belongs to user's team
    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: kbId, teamId: user.teamId },
      select: { id: true },
    });

    if (!kb) {
      return NextResponse.json(
        { error: 'Knowledge base not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { autoSaveTranscripts, transcriptFolderId } = body;

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};

    if (autoSaveTranscripts !== undefined) {
      updateData.autoSaveTranscripts = autoSaveTranscripts;
    }

    if (transcriptFolderId !== undefined) {
      updateData.transcriptFolderId = transcriptFolderId;
    }

    // Upsert: create if not exists, update if exists
    const settings = await prisma.kBProjectSettings.upsert({
      where: { projectId },
      create: {
        projectId,
        knowledgeBaseId: kbId,
        autoSaveTranscripts: autoSaveTranscripts ?? true,
        transcriptFolderId: transcriptFolderId ?? undefined,
      },
      update: updateData,
      include: {
        transcriptFolder: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[KB Project Settings PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update project settings' },
      { status: 500 }
    );
  }
}
