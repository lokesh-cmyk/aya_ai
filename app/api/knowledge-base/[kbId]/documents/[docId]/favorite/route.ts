// app/api/knowledge-base/[kbId]/documents/[docId]/favorite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Toggle favorite status for the current user
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

    // Check if a favorite already exists for this user + document
    const existingFavorite = await prisma.kBFavorite.findUnique({
      where: {
        userId_documentId: {
          userId: session.user.id,
          documentId: docId,
        },
      },
    });

    if (existingFavorite) {
      // Remove favorite
      await prisma.kBFavorite.delete({
        where: { id: existingFavorite.id },
      });

      return NextResponse.json({ favorited: false });
    } else {
      // Create favorite
      await prisma.kBFavorite.create({
        data: {
          userId: session.user.id,
          documentId: docId,
        },
      });

      return NextResponse.json({ favorited: true });
    }
  } catch (error) {
    console.error('[KB Document Favorite POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle favorite' },
      { status: 500 }
    );
  }
}
