/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/change-requests/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionCookie } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
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
    select: { teamId: true, role: true, name: true },
  });

  return { session, user };
}

const approveRejectSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

// Approve or reject a change request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { session, user } = result;

    // Only ADMIN can approve/reject
    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can approve or reject change requests' },
        { status: 403 }
      );
    }

    // Verify change request exists and belongs to user's team
    const existing = await prisma.changeRequest.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { teamId: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
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
    const validated = approveRejectSchema.parse(body);

    let changeRequest;

    if (validated.action === 'approve') {
      changeRequest = await prisma.changeRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: session.user.id,
          approvedAt: new Date(),
        },
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

      // Send notification to the creator
      try {
        await createNotification({
          userId: existing.createdById,
          title: 'Change request approved',
          message: `${user.name || 'An admin'} approved your change request "${existing.title}" for vendor ${existing.vendor.name}`,
          type: 'success',
          link: `/vendors/${existing.vendorId}?tab=changes`,
          metadata: { changeRequestId: id, vendorId: existing.vendorId },
        });
      } catch (err) {
        console.error('Failed to send approval notification:', err);
      }
    } else {
      // reject
      changeRequest = await prisma.changeRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedById: session.user.id,
          approvedAt: new Date(),
          rejectedReason: validated.reason || null,
        },
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

      // Send notification to the creator
      try {
        await createNotification({
          userId: existing.createdById,
          title: 'Change request rejected',
          message: `${user.name || 'An admin'} rejected your change request "${existing.title}" for vendor ${existing.vendor.name}${validated.reason ? `: ${validated.reason}` : ''}`,
          type: 'warning',
          link: `/vendors/${existing.vendorId}?tab=changes`,
          metadata: { changeRequestId: id, vendorId: existing.vendorId, reason: validated.reason },
        });
      } catch (err) {
        console.error('Failed to send rejection notification:', err);
      }
    }

    return NextResponse.json({ changeRequest });
  } catch (error) {
    console.error('Approve/reject change request error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process change request' },
      { status: 500 }
    );
  }
}
