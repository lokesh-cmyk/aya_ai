// app/api/knowledge-base/[kbId]/favorites/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// List all of the current user's favorited documents in this KB
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

    // Fetch all favorites for this user in this KB
    const favorites = await prisma.kBFavorite.findMany({
      where: {
        userId: session.user.id,
        document: {
          knowledgeBaseId: kbId,
          isArchived: false,
        },
      },
      include: {
        document: {
          include: {
            uploadedBy: { select: { id: true, name: true } },
            folder: { select: { id: true, name: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to return documents with favoritedAt
    const documents = favorites.map((f) => ({
      ...f.document,
      favoritedAt: f.createdAt,
    }));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('[KB Favorites GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}
