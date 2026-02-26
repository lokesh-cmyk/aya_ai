// app/api/knowledge-base/[kbId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Get a single knowledge base with its folder tree
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

    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: kbId, teamId: user.teamId },
      include: {
        folders: {
          where: { parentFolderId: null },
          include: {
            children: { include: { _count: { select: { documents: true } } } },
            _count: { select: { documents: true } },
            project: { select: { id: true, name: true } },
          },
          orderBy: { name: 'asc' },
        },
        _count: { select: { documents: true, folders: true } },
      },
    });

    if (!kb) {
      return NextResponse.json(
        { error: 'Knowledge base not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ knowledgeBase: kb });
  } catch (error) {
    console.error('[KB GET detail] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge base' },
      { status: 500 }
    );
  }
}
