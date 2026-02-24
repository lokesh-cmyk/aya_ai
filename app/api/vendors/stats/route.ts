/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/vendors/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionCookie } from '@/lib/auth';

// Get vendor dashboard stats
export async function GET(request: NextRequest) {
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

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    if (!user?.teamId) {
      return NextResponse.json({
        totalVendors: 0,
        activeVendors: 0,
        totalSLAs: 0,
        slaBreaches: 0,
        openChangeRequests: 0,
        highRisks: 0,
        upcomingRenewals: [],
        recentChangeRequests: [],
        recentRisks: [],
      });
    }

    const teamId = user.teamId;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel for performance
    const [
      totalVendors,
      activeVendors,
      totalSLAs,
      slaBreaches,
      openChangeRequests,
      highRisks,
      upcomingRenewals,
      recentChangeRequests,
      recentRisks,
    ] = await Promise.all([
      // 1. Total vendors for this team
      prisma.vendor.count({
        where: { teamId },
      }),

      // 2. Active vendors
      prisma.vendor.count({
        where: { teamId, status: 'ACTIVE' },
      }),

      // 3. Total SLAs where vendor belongs to this team
      prisma.sLA.count({
        where: {
          vendor: { teamId },
        },
      }),

      // 4. SLA breaches where vendor belongs to this team
      prisma.sLA.count({
        where: {
          status: 'BREACHED',
          vendor: { teamId },
        },
      }),

      // 5. Open change requests (DRAFT, SUBMITTED, UNDER_REVIEW)
      prisma.changeRequest.count({
        where: {
          status: { in: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'] },
          vendor: { teamId },
        },
      }),

      // 6. High risks (riskScore >= 16, status OPEN or MITIGATING, linked to team)
      prisma.risk.count({
        where: {
          riskScore: { gte: 16 },
          status: { in: ['OPEN', 'MITIGATING'] },
          OR: [
            { vendor: { teamId } },
            { createdBy: { teamId } },
          ],
        },
      }),

      // 7. Upcoming renewals within 30 days
      prisma.vendor.findMany({
        where: {
          teamId,
          renewalDate: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        },
        select: {
          id: true,
          name: true,
          renewalDate: true,
          renewalType: true,
          status: true,
        },
        orderBy: {
          renewalDate: 'asc',
        },
      }),

      // 8. Last 5 change requests for the team, with vendor name and creator name
      prisma.changeRequest.findMany({
        where: {
          vendor: { teamId },
        },
        include: {
          vendor: {
            select: { name: true },
          },
          createdBy: {
            select: { name: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      }),

      // 9. Last 5 risks for the team, with vendor name
      prisma.risk.findMany({
        where: {
          OR: [
            { vendor: { teamId } },
            { createdBy: { teamId } },
          ],
        },
        include: {
          vendor: {
            select: { name: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      totalVendors,
      activeVendors,
      totalSLAs,
      slaBreaches,
      openChangeRequests,
      highRisks,
      upcomingRenewals,
      recentChangeRequests,
      recentRisks,
    });
  } catch (error) {
    console.error('Get vendor stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor stats' },
      { status: 500 }
    );
  }
}
