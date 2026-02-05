/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { auth, getSessionCookie } from '@/lib/auth';

/**
 * Sync Outlook emails for a user
 * This endpoint triggers an Inngest event to sync emails in the background
 */
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
      select: { teamId: true, email: true },
    });

    if (!user?.teamId) {
      return NextResponse.json(
        { error: 'User must be part of a team' },
        { status: 400 }
      );
    }

    // Send event to Inngest to process in background
    const { inngest } = await import('@/lib/inngest/client');
    await inngest.send({
      name: 'email/outlook.sync',
      data: {
        userId: session.user.id,
        userEmail: user.email || '',
        teamId: user.teamId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Outlook sync started in background',
    });
  } catch (error: any) {
    console.error('Outlook sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger Outlook sync' },
      { status: 500 }
    );
  }
}
