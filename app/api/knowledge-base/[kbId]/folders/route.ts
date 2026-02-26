// app/api/knowledge-base/[kbId]/folders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// List folders for a knowledge base
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
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

    const { kbId } = await params;

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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const parentFolderId = searchParams.get('parentFolderId');
    const projectId = searchParams.get('projectId');

    // Build where clause
    const where: Record<string, unknown> = {
      knowledgeBaseId: kbId,
    };

    // parentFolderId: null means root folders, a value means children of that folder
    // If not provided at all, return all folders
    if (parentFolderId === 'null' || parentFolderId === '') {
      where.parentFolderId = null;
    } else if (parentFolderId) {
      where.parentFolderId = parentFolderId;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    const folders = await prisma.kBFolder.findMany({
      where,
      include: {
        children: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        _count: { select: { documents: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ folders });
  } catch (error) {
    console.error('[KB Folders GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}

// Create a new folder in a knowledge base
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
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

    const { kbId } = await params;

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
    const { name, description, parentFolderId, projectId, type } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    // Validate parentFolderId if provided
    if (parentFolderId) {
      const parentFolder = await prisma.kBFolder.findFirst({
        where: { id: parentFolderId, knowledgeBaseId: kbId },
        select: { id: true },
      });

      if (!parentFolder) {
        return NextResponse.json(
          { error: 'Parent folder not found' },
          { status: 404 }
        );
      }
    }

    // Validate projectId if provided
    if (projectId) {
      const project = await prisma.space.findFirst({
        where: { id: projectId, teamId: user.teamId },
        select: { id: true },
      });

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }
    }

    const folder = await prisma.kBFolder.create({
      data: {
        knowledgeBaseId: kbId,
        name: name.trim(),
        description: description?.trim() || null,
        parentFolderId: parentFolderId || null,
        projectId: projectId || null,
        type: type || 'GENERAL',
        createdById: session.user.id,
      },
      include: {
        children: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        _count: { select: { documents: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    console.error('[KB Folders POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
