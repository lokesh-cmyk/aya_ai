/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { inngest } from '@/lib/inngest/client';

/**
 * Manually trigger email auto-management for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
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
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    // Trigger email processing
    await inngest.send({
      name: "email/manual-process",
      data: {
        userId: session.user.id,
        teamId: user?.teamId || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Email processing triggered successfully',
    }, { status: 200 });
  } catch (error: any) {
    console.error('Manual email processing error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger email processing' },
      { status: 500 }
    );
  }
}
