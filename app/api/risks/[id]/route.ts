/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/risks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionCookie } from '@/lib/auth';
import { z } from 'zod';

const updateRiskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  probability: z.number().int().min(1).max(5).optional(),
  impact: z.number().int().min(1).max(5).optional(),
  status: z.enum(['OPEN', 'MITIGATING', 'RESOLVED', 'ACCEPTED']).optional(),
  mitigationPlan: z.string().optional().nullable(),
  aiSuggestions: z.any().optional(),
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

// Helper: fetch risk and verify team access
async function getRiskWithTeamCheck(id: string, teamId: string | null | undefined) {
  const risk = await prisma.risk.findUnique({
    where: { id },
    include: {
      vendor: {
        select: { id: true, name: true, teamId: true },
      },
      changeRequest: {
        select: { id: true, title: true },
      },
      createdBy: {
        select: { id: true, name: true, teamId: true },
      },
    },
  });

  if (!risk) {
    return { notFound: true as const };
  }

  // Team check: risk is accessible if vendor belongs to team, or if no vendor and creator belongs to team
  const hasAccess = risk.vendor
    ? risk.vendor.teamId === teamId
    : risk.createdBy.teamId === teamId;

  if (!hasAccess) {
    return { forbidden: true as const };
  }

  return { risk };
}

// Get risk detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    const riskResult = await getRiskWithTeamCheck(id, user?.teamId);

    if ('notFound' in riskResult) {
      return NextResponse.json(
        { error: 'Risk not found' },
        { status: 404 }
      );
    }

    if ('forbidden' in riskResult) {
      return NextResponse.json(
        { error: 'You do not have access to this risk' },
        { status: 403 }
      );
    }

    return NextResponse.json({ risk: riskResult.risk });
  } catch (error) {
    console.error('Get risk error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch risk' },
      { status: 500 }
    );
  }
}

// Update risk
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
        { error: 'Viewers cannot update risks' },
        { status: 403 }
      );
    }

    const riskResult = await getRiskWithTeamCheck(id, user?.teamId);

    if ('notFound' in riskResult) {
      return NextResponse.json(
        { error: 'Risk not found' },
        { status: 404 }
      );
    }

    if ('forbidden' in riskResult) {
      return NextResponse.json(
        { error: 'You do not have access to this risk' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updateRiskSchema.parse(body);

    // Recompute riskScore if probability or impact changed
    const updateData: any = { ...validated };
    const newProbability = validated.probability ?? riskResult.risk.probability;
    const newImpact = validated.impact ?? riskResult.risk.impact;

    if (validated.probability !== undefined || validated.impact !== undefined) {
      updateData.riskScore = newProbability * newImpact;
    }

    const risk = await prisma.risk.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ risk });
  } catch (error) {
    console.error('Update risk error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update risk' },
      { status: 500 }
    );
  }
}

// Delete risk
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    // Only admins can delete risks
    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can delete risks' },
        { status: 403 }
      );
    }

    const riskResult = await getRiskWithTeamCheck(id, user?.teamId);

    if ('notFound' in riskResult) {
      return NextResponse.json(
        { error: 'Risk not found' },
        { status: 404 }
      );
    }

    if ('forbidden' in riskResult) {
      return NextResponse.json(
        { error: 'You do not have access to this risk' },
        { status: 403 }
      );
    }

    await prisma.risk.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete risk error:', error);
    return NextResponse.json(
      { error: 'Failed to delete risk' },
      { status: 500 }
    );
  }
}
