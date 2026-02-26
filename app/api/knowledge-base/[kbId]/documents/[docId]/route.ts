// app/api/knowledge-base/[kbId]/documents/[docId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';

// Get a single document with detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; docId: string }> }
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

    const { kbId, docId } = await params;

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

    // Fetch the document with all related data
    const document = await prisma.kBDocument.findFirst({
      where: {
        id: docId,
        knowledgeBaseId: kbId,
        isArchived: false,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        folder: { select: { id: true, name: true, type: true } },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            uploadedBy: { select: { id: true, name: true } },
          },
        },
        favorites: {
          where: { userId: session.user.id },
        },
        _count: { select: { favorites: true, versions: true } },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Generate a signed URL for the document
    const storage = getStorageProvider();
    const signedUrl = await storage.getSignedUrl(document.storageKey, 3600);

    return NextResponse.json({
      document: {
        ...document,
        signedUrl,
        isFavorited: document.favorites.length > 0,
      },
    });
  } catch (error) {
    console.error('[KB Document GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

// Update document metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; docId: string }> }
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

    const { kbId, docId } = await params;

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

    // Verify document exists in this KB
    const existingDoc = await prisma.kBDocument.findFirst({
      where: {
        id: docId,
        knowledgeBaseId: kbId,
        isArchived: false,
      },
      select: { id: true },
    });

    if (!existingDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, description, tags, folderId } = body;

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (tags !== undefined) {
      updateData.tags = tags;
    }

    if (folderId !== undefined) {
      // Validate the target folder belongs to this KB
      const targetFolder = await prisma.kBFolder.findFirst({
        where: { id: folderId, knowledgeBaseId: kbId },
        select: { id: true },
      });

      if (!targetFolder) {
        return NextResponse.json(
          { error: 'Target folder not found in this knowledge base' },
          { status: 404 }
        );
      }

      updateData.folderId = folderId;
    }

    const document = await prisma.kBDocument.update({
      where: { id: docId },
      data: updateData,
      include: {
        uploadedBy: { select: { id: true, name: true } },
        folder: { select: { id: true, name: true, type: true } },
        _count: { select: { favorites: true, versions: true } },
      },
    });

    return NextResponse.json({ document });
  } catch (error) {
    console.error('[KB Document PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

// Soft delete (archive) a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; docId: string }> }
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

    const { kbId, docId } = await params;

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

    // Verify document exists in this KB
    const existingDoc = await prisma.kBDocument.findFirst({
      where: {
        id: docId,
        knowledgeBaseId: kbId,
        isArchived: false,
      },
      select: { id: true },
    });

    if (!existingDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Soft delete - set isArchived to true
    await prisma.kBDocument.update({
      where: { id: docId },
      data: { isArchived: true },
    });

    return NextResponse.json({ success: true, message: 'Document archived' });
  } catch (error) {
    console.error('[KB Document DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to archive document' },
      { status: 500 }
    );
  }
}
