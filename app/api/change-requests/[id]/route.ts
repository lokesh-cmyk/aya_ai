/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/change-requests/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionCookie } from '@/lib/auth';
import { z } from 'zod';

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

const updateChangeRequestSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  requestedBy: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED']).optional(),
  requestedChange: z.record(z.string(), z.any()).optional(),
  impactAnalysis: z.record(z.string(), z.any()).optional(),
  originalPlan: z.record(z.string(), z.any()).optional(),
});

// Get change request detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    const changeRequest = await prisma.changeRequest.findUnique({
      where: { id },
      include: {
        vendor: {
          include: {
            contacts: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        risks: true,
      },
    });

    if (!changeRequest) {
      return NextResponse.json(
        { error: 'Change request not found' },
        { status: 404 }
      );
    }

    // Verify vendor.teamId matches user's teamId
    if (changeRequest.vendor.teamId !== user?.teamId) {
      return NextResponse.json(
        { error: 'You do not have access to this change request' },
        { status: 403 }
      );
    }

    return NextResponse.json({ changeRequest });
  } catch (error) {
    console.error('Get change request error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch change request' },
      { status: 500 }
    );
  }
}

// Update change request
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
        { error: 'Viewers cannot update change requests' },
        { status: 403 }
      );
    }

    // Verify change request exists and belongs to user's team
    const existing = await prisma.changeRequest.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { teamId: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Change request not found' },
        { status: 404 }
      );
    }

    if (existing.vendor.teamId !== user?.teamId) {
      return NextResponse.json(
        { error: 'You do not have access to this change request' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updateChangeRequestSchema.parse(body);

    // Status transition rules
    if (validated.status) {
      const currentStatus = existing.status;
      const newStatus = validated.status;

      if (user?.role === 'EDITOR') {
        // EDITOR can only change: DRAFT -> SUBMITTED
        if (!(currentStatus === 'DRAFT' && newStatus === 'SUBMITTED')) {
          return NextResponse.json(
            { error: `Editors can only submit draft change requests (DRAFT -> SUBMITTED)` },
            { status: 403 }
          );
        }
      }
      // ADMIN can change any status — no restriction needed
    }

    const changeRequest = await prisma.changeRequest.update({
      where: { id },
      data: validated,
      include: {
        vendor: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        risks: true,
      },
    });

    return NextResponse.json({ changeRequest });
  } catch (error) {
    console.error('Update change request error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update change request' },
      { status: 500 }
    );
  }
}
