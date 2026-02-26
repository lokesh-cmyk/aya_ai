// app/api/knowledge-base/[kbId]/documents/[docId]/versions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStorageProvider, buildStorageKey } from '@/lib/storage';
import { inngest } from '@/lib/inngest/client';

// List all versions of a document
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

    // Verify document exists in this KB
    const document = await prisma.kBDocument.findFirst({
      where: {
        id: docId,
        knowledgeBaseId: kbId,
        isArchived: false,
      },
      select: { id: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Fetch all versions ordered by versionNumber desc
    const versions = await prisma.kBDocumentVersion.findMany({
      where: { documentId: docId },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: { versionNumber: 'desc' },
    });

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('[KB Document Versions GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document versions' },
      { status: 500 }
    );
  }
}

// Upload a new version of a document
export async function POST(
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

    // Fetch current document with full details
    const currentDoc = await prisma.kBDocument.findFirst({
      where: {
        id: docId,
        knowledgeBaseId: kbId,
        isArchived: false,
      },
    });

    if (!currentDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const changeNote = formData.get('changeNote') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    const newVersionNumber = currentDoc.currentVersion + 1;

    // Step 1: Snapshot current version to KBDocumentVersion
    await prisma.kBDocumentVersion.create({
      data: {
        documentId: docId,
        versionNumber: currentDoc.currentVersion,
        fileUrl: currentDoc.fileUrl,
        storageKey: currentDoc.storageKey,
        fileSize: currentDoc.fileSize,
        content: currentDoc.content,
        pineconeId: currentDoc.pineconeId,
        changeNote: changeNote?.trim() || null,
        uploadedById: currentDoc.uploadedById,
      },
    });

    // Step 2: Upload new file to storage with version suffix to avoid key collision
    const storage = getStorageProvider();
    const filename = file.name;
    const storageKey = buildStorageKey(
      user.teamId,
      kbId,
      currentDoc.folderId,
      docId,
      `_v${newVersionNumber}_${filename}`
    );
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'application/octet-stream';
    const uploadResult = await storage.upload(storageKey, fileBuffer, mimeType);

    // Step 3: Update document with new file info + increment currentVersion
    // Clear content and pineconeId (will be re-extracted/re-embedded)
    const updatedDocument = await prisma.kBDocument.update({
      where: { id: docId },
      data: {
        fileUrl: uploadResult.url,
        storageKey: uploadResult.key,
        fileSize: file.size,
        mimeType,
        currentVersion: newVersionNumber,
        content: null,
        pineconeId: null,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        folder: { select: { id: true, name: true, type: true } },
        _count: { select: { favorites: true, versions: true } },
      },
    });

    // Step 4: Send Inngest event to trigger re-processing
    await inngest.send({
      name: 'kb/document.process',
      data: {
        documentId: docId,
        teamId: user.teamId,
      },
    });

    return NextResponse.json(
      { document: updatedDocument, versionNumber: newVersionNumber },
      { status: 201 }
    );
  } catch (error) {
    console.error('[KB Document Versions POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload new version' },
      { status: 500 }
    );
  }
}
