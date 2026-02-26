// app/api/knowledge-base/[kbId]/folders/[folderId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';

// Update a folder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; folderId: string }> }
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

    const { kbId, folderId } = await params;

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

    // Verify folder exists in this KB
    const existingFolder = await prisma.kBFolder.findFirst({
      where: { id: folderId, knowledgeBaseId: kbId },
      select: { id: true },
    });

    if (!existingFolder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, parentFolderId } = body;

    // Build update data — only include fields that are provided
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (!name?.trim()) {
        return NextResponse.json(
          { error: 'Folder name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (parentFolderId !== undefined) {
      // Allow setting to null (move to root)
      if (parentFolderId === null) {
        updateData.parentFolderId = null;
      } else {
        // Prevent setting parent to self
        if (parentFolderId === folderId) {
          return NextResponse.json(
            { error: 'A folder cannot be its own parent' },
            { status: 400 }
          );
        }

        // Validate parent folder exists in the same KB
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

        updateData.parentFolderId = parentFolderId;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const folder = await prisma.kBFolder.update({
      where: { id: folderId },
      data: updateData,
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

    return NextResponse.json({ folder });
  } catch (error) {
    console.error('[KB Folder PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    );
  }
}

// Delete a folder and its storage files
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; folderId: string }> }
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

    const { kbId, folderId } = await params;

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

    // Verify folder exists in this KB
    const existingFolder = await prisma.kBFolder.findFirst({
      where: { id: folderId, knowledgeBaseId: kbId },
      select: { id: true },
    });

    if (!existingFolder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Fetch all documents in this folder (and nested folders) to clean up storage
    const documents = await prisma.kBDocument.findMany({
      where: { folderId },
      select: { storageKey: true },
    });

    // Delete files from storage provider
    if (documents.length > 0) {
      const storage = getStorageProvider();
      await Promise.allSettled(
        documents.map((doc) => storage.delete(doc.storageKey))
      );
    }

    // Delete the folder (Prisma cascade handles DB records)
    await prisma.kBFolder.delete({
      where: { id: folderId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[KB Folder DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
