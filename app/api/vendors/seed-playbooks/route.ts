// app/api/vendors/seed-playbooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionCookie } from '@/lib/auth';
import { DEFAULT_PLAYBOOKS } from '@/lib/vendors/seed-playbooks';

// POST — seed default system playbooks for a team
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { auth } = await import('@/lib/auth');
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's team and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true, role: true },
    });

    // Only ADMIN can seed playbooks
    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can seed playbooks' },
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

    // Check if system playbooks already exist for this team
    const existingCount = await prisma.playbook.count({
      where: {
        teamId,
        isSystemProvided: true,
      },
    });

    if (existingCount > 0) {
      return NextResponse.json({
        seeded: 0,
        message: `System playbooks already exist for this team (${existingCount} found). Skipping seed.`,
      });
    }

    // Create all default playbooks for this team
    const created = await prisma.$transaction(
      DEFAULT_PLAYBOOKS.map((playbook) =>
        prisma.playbook.create({
          data: {
            name: playbook.name,
            description: playbook.description,
            category: playbook.category,
            triggerCondition: playbook.triggerCondition,
            steps: playbook.steps as any,
            isSystemProvided: playbook.isSystemProvided,
            isActive: playbook.isActive,
            teamId,
          },
        })
      )
    );

    return NextResponse.json({
      seeded: created.length,
      message: `Successfully seeded ${created.length} default playbooks.`,
    });
  } catch (error) {
    console.error('Seed playbooks error:', error);
    return NextResponse.json(
      { error: 'Failed to seed playbooks' },
      { status: 500 }
    );
  }
}
