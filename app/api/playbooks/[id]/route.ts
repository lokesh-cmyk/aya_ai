/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/playbooks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionCookie } from '@/lib/auth';
import { z } from 'zod';

const updatePlaybookSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: z.enum([
    'SLA_BREACH',
    'CONTRACT',
    'DELIVERY',
    'FINANCIAL',
    'OPERATIONAL',
    'SECURITY',
  ]).optional(),
  triggerCondition: z.string().optional().nullable(),
  steps: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string(),
      order: z.number().int(),
    })
  ).optional(),
  isActive: z.boolean().optional(),
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

// Get playbook detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    const playbook = await prisma.playbook.findUnique({
      where: { id },
    });

    if (!playbook) {
      return NextResponse.json(
        { error: 'Playbook not found' },
        { status: 404 }
      );
    }

    // Team check
    if (playbook.teamId !== user?.teamId) {
      return NextResponse.json(
        { error: 'You do not have access to this playbook' },
        { status: 403 }
      );
    }

    return NextResponse.json({ playbook });
  } catch (error) {
    console.error('Get playbook error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playbook' },
      { status: 500 }
    );
  }
}

// Update playbook
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    // VIEWER cannot update
    if (user?.role === 'VIEWER') {
      return NextResponse.json(
        { error: 'Viewers cannot update playbooks' },
        { status: 403 }
      );
    }

    const existing = await prisma.playbook.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Playbook not found' },
        { status: 404 }
      );
    }

    // Team check
    if (existing.teamId !== user?.teamId) {
      return NextResponse.json(
        { error: 'You do not have access to this playbook' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updatePlaybookSchema.parse(body);

    // System-provided playbooks can only have isActive toggled
    if (existing.isSystemProvided) {
      const nonToggleKeys = Object.keys(validated).filter(
        (key) => key !== 'isActive'
      );
      if (nonToggleKeys.length > 0) {
        return NextResponse.json(
          { error: 'System-provided playbooks can only have their active status toggled' },
          { status: 403 }
        );
      }
    }

    const playbook = await prisma.playbook.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json({ playbook });
  } catch (error) {
    console.error('Update playbook error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update playbook' },
      { status: 500 }
    );
  }
}

// Delete playbook
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    // Only admins can delete playbooks
    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can delete playbooks' },
        { status: 403 }
      );
    }

    const existing = await prisma.playbook.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Playbook not found' },
        { status: 404 }
      );
    }

    // Team check
    if (existing.teamId !== user?.teamId) {
      return NextResponse.json(
        { error: 'You do not have access to this playbook' },
        { status: 403 }
      );
    }

    // Cannot delete system-provided playbooks
    if (existing.isSystemProvided) {
      return NextResponse.json(
        { error: 'System-provided playbooks cannot be deleted' },
        { status: 403 }
      );
    }

    await prisma.playbook.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete playbook error:', error);
    return NextResponse.json(
      { error: 'Failed to delete playbook' },
      { status: 500 }
    );
  }
}
