/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/vendors/[id]/slas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionCookie } from '@/lib/auth';
import { z } from 'zod';

const createSLASchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  metric: z.string().min(1, 'Metric is required'),
  target: z.string().min(1, 'Target is required'),
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

// List SLAs for a vendor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    // Verify vendor exists and belongs to user's team
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: { teamId: true },
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

    // Order by status: BREACHED first, then AT_RISK, then MET
    // Prisma orders enums alphabetically by default, so status asc = AT_RISK, BREACHED, MET
    // We need a custom sort; use raw ordering or fetch-then-sort
    const slas = await prisma.sLA.findMany({
      where: { vendorId: id },
    });

    const statusOrder: Record<string, number> = {
      BREACHED: 0,
      AT_RISK: 1,
      MET: 2,
    };

    slas.sort((a, b) => {
      const aOrder = statusOrder[a.status] ?? 99;
      const bOrder = statusOrder[b.status] ?? 99;
      return aOrder - bOrder;
    });

    return NextResponse.json({ slas });
  } catch (error) {
    console.error('List vendor SLAs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor SLAs' },
      { status: 500 }
    );
  }
}

// Add an SLA to a vendor
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    // VIEWER cannot create
    if (user?.role === 'VIEWER') {
      return NextResponse.json(
        { error: 'Only admins and editors can create SLAs' },
        { status: 403 }
      );
    }

    // Verify vendor exists and belongs to user's team
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: { teamId: true },
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

    const body = await request.json();
    const validated = createSLASchema.parse(body);

    const sla = await prisma.sLA.create({
      data: {
        name: validated.name,
        description: validated.description || null,
        metric: validated.metric,
        target: validated.target,
        status: 'MET',
        vendorId: id,
      },
    });

    return NextResponse.json({ sla }, { status: 201 });
  } catch (error) {
    console.error('Create vendor SLA error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create vendor SLA' },
      { status: 500 }
    );
  }
}
