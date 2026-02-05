/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pipedream } from '@/lib/integrations/pipedream';
import { auth } from '@/lib/auth';

// OAuth callback handler
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const platform = searchParams.get('platform') || searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !platform) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=missing_code', request.url)
      );
    }

    // Get user from session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("better-auth.session_token");
    
    if (!sessionCookie) {
      return NextResponse.redirect(
        new URL('/login?redirect=/settings/integrations', request.url)
      );
    }

    // Get session to find user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.redirect(
        new URL('/login?redirect=/settings/integrations', request.url)
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/callback?platform=${platform}`;

    // Exchange code for tokens
    const tokens = await pipedream.exchangeCode(platform, code, redirectUri);

    // Get user's team
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    // Save connection
    await pipedream.saveConnection(
      session.user.id,
      user?.teamId || '',
      platform,
      tokens
    );

    return NextResponse.redirect(
      new URL('/settings/integrations?success=true', request.url)
    );
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${encodeURIComponent(error.message || 'connection_failed')}`, request.url)
    );
  }
}

