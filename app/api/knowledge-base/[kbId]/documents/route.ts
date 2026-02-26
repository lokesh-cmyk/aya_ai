// app/api/knowledge-base/[kbId]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStorageProvider, buildStorageKey } from '@/lib/storage';
import { inngest } from '@/lib/inngest/client';
import { KBFileType } from '@/app/generated/prisma/enums';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function getMimeTypeMapping(mimeType: string): KBFileType {
  switch (mimeType) {
    case 'application/pdf':
      return KBFileType.PDF;
    case 'image/png':
    case 'image/jpeg':
    case 'image/gif':
    case 'image/webp':
    case 'image/svg+xml':
      return KBFileType.IMAGE;
    case 'text/markdown':
      return KBFileType.MARKDOWN;
    case 'text/plain':
      return KBFileType.TEXT;
    case 'audio/mpeg':
    case 'audio/wav':
    case 'audio/ogg':
    case 'audio/webm':
      return KBFileType.AUDIO;
    default:
      return KBFileType.OTHER;
  }
}

// List documents for a knowledge base with filters
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
    const folderId = searchParams.get('folderId');
    const fileType = searchParams.get('fileType');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where clause
    const where: Record<string, unknown> = {
      knowledgeBaseId: kbId,
      isArchived: false,
    };

    if (folderId) {
      where.folderId = folderId;
    }

    if (fileType) {
      where.fileType = fileType;
    }

    // Fetch documents and total count in parallel
    const [documents, total] = await Promise.all([
      prisma.kBDocument.findMany({
        where,
        include: {
          uploadedBy: { select: { id: true, name: true } },
          folder: { select: { id: true, name: true, type: true } },
          _count: { select: { favorites: true, versions: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.kBDocument.count({ where }),
    ]);

    return NextResponse.json({ documents, total });
  } catch (error) {
    console.error('[KB Documents GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// Upload a document to a knowledge base
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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folderId = formData.get('folderId') as string | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const tagsRaw = formData.get('tags') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!folderId) {
      return NextResponse.json(
        { error: 'folderId is required' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Validate folder belongs to this KB
    const folder = await prisma.kBFolder.findFirst({
      where: { id: folderId, knowledgeBaseId: kbId },
      select: { id: true },
    });

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found in this knowledge base' },
        { status: 404 }
      );
    }

    // Parse tags
    let tags: string[] = [];
    if (tagsRaw) {
      try {
        tags = JSON.parse(tagsRaw);
      } catch {
        return NextResponse.json(
          { error: 'Tags must be a valid JSON string array' },
          { status: 400 }
        );
      }
    }

    // Determine file type from MIME type
    const mimeType = file.type || 'application/octet-stream';
    const fileType = getMimeTypeMapping(mimeType);
    const filename = file.name;

    // Create the document record first (with empty fileUrl/storageKey)
    const document = await prisma.kBDocument.create({
      data: {
        knowledgeBaseId: kbId,
        folderId,
        title: title?.trim() || filename,
        description: description?.trim() || null,
        fileType,
        mimeType,
        fileSize: file.size,
        fileUrl: '',
        storageKey: '',
        tags,
        uploadedById: session.user.id,
      },
    });

    try {
      // Upload to storage
      const storage = getStorageProvider();
      const storageKey = buildStorageKey(
        user.teamId,
        kbId,
        folderId,
        document.id,
        filename
      );
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const uploadResult = await storage.upload(storageKey, fileBuffer, mimeType);

      // For text-based files, extract content synchronously so search works immediately
      let extractedContent: string | null = null;
      if (fileType === KBFileType.TEXT || fileType === KBFileType.MARKDOWN) {
        extractedContent = fileBuffer.toString('utf-8');
      }

      // Update document with storage URL, key, and any extracted content
      const updatedDocument = await prisma.kBDocument.update({
        where: { id: document.id },
        data: {
          fileUrl: uploadResult.url,
          storageKey: uploadResult.key,
          ...(extractedContent ? { content: extractedContent } : {}),
        },
        include: {
          uploadedBy: { select: { id: true, name: true } },
          folder: { select: { id: true, name: true, type: true } },
          _count: { select: { favorites: true, versions: true } },
        },
      });

      // Send Inngest event for background processing (embeddings + PDF extraction)
      try {
        await inngest.send({
          name: 'kb/document.process',
          data: {
            documentId: document.id,
            teamId: user.teamId,
          },
        });
      } catch (inngestError) {
        // Don't fail the upload if Inngest is unavailable — content is already saved for text files
        console.warn('[KB Documents POST] Inngest send failed (document still uploaded):', inngestError);
      }

      return NextResponse.json({ document: updatedDocument }, { status: 201 });
    } catch (uploadError) {
      // If upload fails, clean up the document record
      await prisma.kBDocument.delete({ where: { id: document.id } });
      throw uploadError;
    }
  } catch (error) {
    console.error('[KB Documents POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
