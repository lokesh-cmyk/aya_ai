/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/playbooks/adopt/route.ts
// Copies a system playbook into the user's team
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionCookie } from '@/lib/auth';
import { z } from 'zod';

const adoptSchema = z.object({
  playbookId: z.string().min(1, 'Playbook ID is required'),
});

export async function POST(request: NextRequest) {
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true, role: true },
    });

    if (!user?.teamId) {
      return NextResponse.json(
        { error: 'User must belong to a team' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { playbookId } = adoptSchema.parse(body);

    // Fetch the source playbook
    const source = await prisma.playbook.findUnique({
      where: { id: playbookId },
    });

    if (!source || !source.isSystemProvided) {
      return NextResponse.json(
        { error: 'Playbook not found or not a system playbook' },
        { status: 404 }
      );
    }

    // Check if team already has this playbook (by name + isSystemProvided)
    const existing = await prisma.playbook.findFirst({
      where: {
        teamId: user.teamId,
        name: source.name,
        isSystemProvided: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Your team already has this playbook', playbook: existing },
        { status: 409 }
      );
    }

    // Copy the playbook into the team
    const adopted = await prisma.playbook.create({
      data: {
        name: source.name,
        description: source.description,
        category: source.category,
        triggerCondition: source.triggerCondition,
        steps: source.steps as any,
        isSystemProvided: true,
        isActive: true,
        teamId: user.teamId,
      },
    });

    return NextResponse.json({ playbook: adopted }, { status: 201 });
  } catch (error) {
    console.error('Adopt playbook error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to adopt playbook' },
      { status: 500 }
    );
  }
}
