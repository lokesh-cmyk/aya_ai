/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/risks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionCookie } from '@/lib/auth';
import { z } from 'zod';

const createRiskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  probability: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  category: z.enum([
    'SLA_BREACH',
    'CONTRACT',
    'DELIVERY',
    'FINANCIAL',
    'OPERATIONAL',
    'SECURITY',
  ]),
  vendorId: z.string().optional(),
  changeRequestId: z.string().optional(),
  mitigationPlan: z.string().optional(),
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

// List risks
export async function GET(request: NextRequest) {
  try {
    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    const teamId = user?.teamId;
    if (!teamId) {
      return NextResponse.json({ risks: [], pagination: { total: 0, limit: 50, offset: 0, hasMore: false } });
    }

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {
      OR: [
        { vendor: { teamId } },
        { vendorId: null, createdBy: { teamId } },
      ],
    };

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    const [risks, total] = await Promise.all([
      prisma.risk.findMany({
        where,
        include: {
          vendor: {
            select: { id: true, name: true },
          },
          changeRequest: {
            select: { id: true, title: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { riskScore: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.risk.count({ where }),
    ]);

    return NextResponse.json({
      risks,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Get risks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch risks' },
      { status: 500 }
    );
  }
}

// Create risk
export async function POST(request: NextRequest) {
  try {
    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { session, user } = result;

    // VIEWER cannot create
    if (user?.role === 'VIEWER') {
      return NextResponse.json(
        { error: 'Viewers cannot create risks' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createRiskSchema.parse(body);

    const riskScore = validated.probability * validated.impact;

    // If vendorId provided, verify it belongs to the user's team
    if (validated.vendorId) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: validated.vendorId },
        select: { teamId: true },
      });

      if (!vendor || vendor.teamId !== user?.teamId) {
        return NextResponse.json(
          { error: 'Vendor not found or does not belong to your team' },
          { status: 403 }
        );
      }
    }

    const risk = await prisma.risk.create({
      data: {
        title: validated.title,
        description: validated.description,
        probability: validated.probability,
        impact: validated.impact,
        riskScore,
        category: validated.category,
        vendorId: validated.vendorId || null,
        changeRequestId: validated.changeRequestId || null,
        mitigationPlan: validated.mitigationPlan,
        createdById: session!.user.id,
      },
      include: {
        vendor: {
          select: { id: true, name: true },
        },
        changeRequest: {
          select: { id: true, title: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    // Trigger AI mitigation generation via Inngest
    try {
      const { inngest } = await import('@/lib/inngest/client');
      await inngest.send({
        name: 'vendor/risk.generate-mitigations',
        data: { riskId: risk.id, userId: session!.user.id },
      }).catch(console.error);
    } catch (err) {
      console.error('Failed to trigger AI mitigation generation:', err);
    }

    return NextResponse.json(risk, { status: 201 });
  } catch (error) {
    console.error('Create risk error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create risk' },
      { status: 500 }
    );
  }
}
