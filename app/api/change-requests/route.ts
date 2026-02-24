/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/change-requests/route.ts
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

const createChangeRequestSchema = z.object({
  vendorId: z.string().min(1, 'vendorId is required'),
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  requestedBy: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  requestedChange: z.record(z.string(), z.any()).optional(),
  originalPlan: z.record(z.string(), z.any()).optional(),
});

// List change requests
export async function GET(request: NextRequest) {
  try {
    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {
      vendor: {
        teamId: user?.teamId,
      },
    };

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    const [changeRequests, total] = await Promise.all([
      prisma.changeRequest.findMany({
        where,
        include: {
          vendor: {
            select: { id: true, name: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
          approvedBy: {
            select: { id: true, name: true },
          },
          _count: {
            select: { risks: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.changeRequest.count({ where }),
    ]);

    return NextResponse.json({
      changeRequests,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('List change requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch change requests' },
      { status: 500 }
    );
  }
}

// Create change request
export async function POST(request: NextRequest) {
  try {
    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { session, user } = result;

    // VIEWER cannot create
    if (user?.role === 'VIEWER') {
      return NextResponse.json(
        { error: 'Viewers cannot create change requests' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createChangeRequestSchema.parse(body);

    // Verify vendor exists and belongs to user's team
    const vendor = await prisma.vendor.findUnique({
      where: { id: validated.vendorId },
      include: {
        slas: {
          select: {
            id: true,
            name: true,
            metric: true,
            target: true,
            currentValue: true,
            status: true,
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

    if (vendor.teamId !== user?.teamId) {
      return NextResponse.json(
        { error: 'You do not have access to this vendor' },
        { status: 403 }
      );
    }

    // Auto-populate originalPlan with vendor's current SLA data and contract details
    const autoOriginalPlan = validated.originalPlan || {
      vendor: {
        name: vendor.name,
        category: vendor.category,
        status: vendor.status,
        contractStart: vendor.contractStart,
        contractEnd: vendor.contractEnd,
        renewalDate: vendor.renewalDate,
        renewalType: vendor.renewalType,
        billingCycle: vendor.billingCycle,
        contractValue: vendor.contractValue,
      },
      slas: vendor.slas,
      snapshotAt: new Date().toISOString(),
    };

    const changeRequest = await prisma.changeRequest.create({
      data: {
        title: validated.title,
        description: validated.description,
        requestedBy: validated.requestedBy,
        priority: validated.priority || 'NORMAL',
        requestedChange: validated.requestedChange || {},
        originalPlan: autoOriginalPlan,
        status: 'DRAFT',
        vendorId: validated.vendorId,
        createdById: session.user.id,
      },
      include: {
        vendor: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
        _count: {
          select: { risks: true },
        },
      },
    });

    // Trigger Inngest event for AI impact analysis
    try {
      const { inngest } = await import('@/lib/inngest/client');
      await inngest.send({
        name: 'vendor/change-request.analyze',
        data: {
          changeRequestId: changeRequest.id,
          vendorId: validated.vendorId,
          userId: session.user.id,
        },
      }).catch(console.error);
    } catch (err) {
      console.error('Failed to trigger change request analysis:', err);
    }

    return NextResponse.json(changeRequest, { status: 201 });
  } catch (error) {
    console.error('Create change request error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create change request' },
      { status: 500 }
    );
  }
}
