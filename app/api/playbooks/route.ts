/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/playbooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionCookie } from '@/lib/auth';
import { z } from 'zod';

const createPlaybookSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.enum([
    'SLA_BREACH',
    'CONTRACT',
    'DELIVERY',
    'FINANCIAL',
    'OPERATIONAL',
    'SECURITY',
  ]),
  triggerCondition: z.string().optional(),
  steps: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string(),
      order: z.number().int(),
    })
  ),
});

// Helper: authenticate and return session + user
async function authenticate(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = getSessionCookie(cookieStore);

  if (!sessionCookie) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { auth } = await import('@/lib/auth');
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true, role: true },
  });

  return { session, user };
}

// List playbooks
export async function GET(request: NextRequest) {
  try {
    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    const teamId = user?.teamId;
    if (!teamId) {
      return NextResponse.json({ playbooks: [] });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const active = searchParams.get('active');

    const where: any = {
      teamId,
    };

    if (category) {
      where.category = category;
    }

    if (active !== null && active !== undefined && active !== '') {
      where.isActive = active === 'true';
    }

    const playbooks = await prisma.playbook.findMany({
      where,
      orderBy: [
        { isSystemProvided: 'desc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ playbooks });
  } catch (error) {
    console.error('Get playbooks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playbooks' },
      { status: 500 }
    );
  }
}

// Create playbook
export async function POST(request: NextRequest) {
  try {
    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    // Only ADMIN can create playbooks
    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can create playbooks' },
        { status: 403 }
      );
    }

    const teamId = user?.teamId;
    if (!teamId) {
      return NextResponse.json(
        { error: 'User must belong to a team' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = createPlaybookSchema.parse(body);

    const playbook = await prisma.playbook.create({
      data: {
        name: validated.name,
        description: validated.description,
        category: validated.category,
        triggerCondition: validated.triggerCondition,
        steps: validated.steps,
        isSystemProvided: false,
        isActive: true,
        teamId,
      },
    });

    return NextResponse.json(playbook, { status: 201 });
  } catch (error) {
    console.error('Create playbook error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create playbook' },
      { status: 500 }
    );
  }
}
