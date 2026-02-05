/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pipedream } from '@/lib/integrations/pipedream';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const connectSchema = z.object({
  platform: z.enum(['gmail', 'slack', 'whatsapp', 'linkedin', 'instagram', 'teams', 'outlook']),
  code: z.string().optional(), // OAuth code
  redirectUri: z.string().optional(),
});

// Get OAuth URL for platform connection
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

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const redirectUri = searchParams.get('redirectUri') || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/callback`;

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      );
    }

    // Get OAuth URL from PipeDream
    const authUrl = await pipedream.getOAuthUrl(platform, redirectUri);

    return NextResponse.json({
      authUrl,
      platform,
    });
  } catch (error: any) {
    console.error('Get OAuth URL error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get OAuth URL' },
      { status: 500 }
    );
  }
}

// Connect platform (exchange code for tokens) - used for server-side flows
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

    // Get authenticated user from Better Auth session
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
    const validated = connectSchema.parse(body);

    const redirectUri = validated.redirectUri || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/callback`;

    if (!validated.code) {
      return NextResponse.json(
        { error: 'OAuth code is required' },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const tokens = await pipedream.exchangeCode(
      validated.platform,
      validated.code,
      redirectUri
    );

    // Look up user's team for organization-level integrations
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    // Save connection
    const connection = await pipedream.saveConnection(
      session.user.id,
      user?.teamId || '',
      validated.platform,
      tokens
    );

    return NextResponse.json({
      success: true,
      connection,
    });
  } catch (error: any) {
    console.error('Connect platform error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to connect platform' },
      { status: 500 }
    );
  }
}

