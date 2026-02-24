/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/vendors/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionCookie } from '@/lib/auth';
import { z } from 'zod';

const updateVendorSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  status: z.enum(['ONBOARDING', 'ACTIVE', 'INACTIVE', 'OFFBOARDING']).optional(),
  website: z
    .string()
    .url('Invalid URL')
    .optional()
    .or(z.literal('')),
  description: z.string().optional(),
  contractStart: z.string().optional().nullable(),
  contractEnd: z.string().optional().nullable(),
  renewalDate: z.string().optional().nullable(),
  renewalType: z.enum(['AUTO', 'MANUAL']).optional(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']).optional(),
  contractValue: z.number().optional().nullable(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
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

// Get vendor detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        contacts: {
          orderBy: { isPrimary: 'desc' },
        },
        slas: {
          orderBy: { createdAt: 'desc' },
        },
        changeRequests: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        risks: {
          orderBy: { riskScore: 'desc' },
          include: {
            createdBy: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        _count: {
          select: {
            contacts: true,
            slas: true,
            changeRequests: true,
            risks: true,
          },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Verify vendor belongs to user's team
    if (vendor.teamId !== user?.teamId) {
      return NextResponse.json(
        { error: 'You do not have access to this vendor' },
        { status: 403 }
      );
    }

    return NextResponse.json({ vendor });
  } catch (error) {
    console.error('Get vendor error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor' },
      { status: 500 }
    );
  }
}

// Update vendor
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    // Check if user is admin or editor
    if (user?.role === 'VIEWER') {
      return NextResponse.json(
        { error: 'Only admins and editors can update vendors' },
        { status: 403 }
      );
    }

    // Verify vendor exists and belongs to team
    const existing = await prisma.vendor.findUnique({
      where: { id },
      select: { teamId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    if (existing.teamId !== user?.teamId) {
      return NextResponse.json(
        { error: 'You do not have access to this vendor' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updateVendorSchema.parse(body);

    // Convert date strings to Date objects
    const updateData: any = { ...validated };
    if (validated.contractStart !== undefined) {
      updateData.contractStart = validated.contractStart
        ? new Date(validated.contractStart)
        : null;
    }
    if (validated.contractEnd !== undefined) {
      updateData.contractEnd = validated.contractEnd
        ? new Date(validated.contractEnd)
        : null;
    }
    if (validated.renewalDate !== undefined) {
      updateData.renewalDate = validated.renewalDate
        ? new Date(validated.renewalDate)
        : null;
    }

    // Handle empty website string
    if (validated.website === '') {
      updateData.website = null;
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: updateData,
      include: {
        contacts: true,
        slas: true,
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        _count: {
          select: {
            contacts: true,
            slas: true,
            changeRequests: true,
            risks: true,
          },
        },
      },
    });

    return NextResponse.json({ vendor });
  } catch (error) {
    console.error('Update vendor error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

// Delete vendor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    // Only admins can delete vendors
    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can delete vendors' },
        { status: 403 }
      );
    }

    // Verify vendor exists and belongs to team
    const existing = await prisma.vendor.findUnique({
      where: { id },
      select: { teamId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    if (existing.teamId !== user?.teamId) {
      return NextResponse.json(
        { error: 'You do not have access to this vendor' },
        { status: 403 }
      );
    }

    // Delete vendor (cascading deletes handle related records)
    await prisma.vendor.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete vendor error:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    );
  }
}
