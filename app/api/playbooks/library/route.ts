/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/playbooks/library/route.ts
// Returns all system-provided playbooks globally (available to all users)
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { auth } = await import('@/lib/auth');
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where: any = {
      isSystemProvided: true,
    };

    if (category) {
      where.category = category;
    }

    const playbooks = await prisma.playbook.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        triggerCondition: true,
        steps: true,
        isSystemProvided: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Deduplicate by name (in case multiple teams have same system playbooks)
    const seen = new Set<string>();
    const unique = playbooks.filter((p) => {
      if (seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });

    return NextResponse.json({ playbooks: unique });
  } catch (error) {
    console.error('Get playbook library error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playbook library' },
      { status: 500 }
    );
  }
}
