/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { SlackClient } from '@/lib/integrations/slack';

// GET: List available Slack channels
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("better-auth.session_token");
    
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
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    const slackClient = new SlackClient(session.user.id, user?.teamId || null);
    const channels = await slackClient.listChannels();

    return NextResponse.json({
      channels,
    });
  } catch (error: any) {
    console.error('[slack/channels] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

// POST: Save selected channels to integration config
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("better-auth.session_token");
    
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

    const body = await request.json();
    const { integrationId, channelIds } = body;

    if (!integrationId || !Array.isArray(channelIds)) {
      return NextResponse.json(
        { error: 'integrationId and channelIds are required' },
        { status: 400 }
      );
    }

    const { prisma } = await import('@/lib/prisma');

    // Verify the integration belongs to the user
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Integration not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update integration config with selected channels
    const config = integration.config as any || {};
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        config: {
          ...config,
          selectedChannels: channelIds,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Channels saved successfully',
    });
  } catch (error: any) {
    console.error('[slack/channels] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save channels' },
      { status: 500 }
    );
  }
}
