/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateStreamToken } from '@/lib/stream/stream-client';

// Generate Stream.io token for authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data from database for Stream profile
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, image: true },
    });

    const token = await generateStreamToken(session.user.id, {
      name: user?.name || session.user.name || undefined,
      email: user?.email || session.user.email || undefined,
      image: user?.image || session.user.image || undefined,
    });

    // Get API key - prefer NEXT_PUBLIC_STREAM_API_KEY, fallback to STREAM_API_KEY
    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY || process.env.STREAM_API_KEY;

    if (!apiKey) {
      console.error('Stream API key not found. Please set NEXT_PUBLIC_STREAM_API_KEY or STREAM_API_KEY in your .env file');
      return NextResponse.json(
        { error: 'Stream API key not configured. Please set NEXT_PUBLIC_STREAM_API_KEY in your .env file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      token,
      apiKey,
    });
  } catch (error: any) {
    console.error('Generate Stream token error:', error);
    const envStatus = {
      STREAM_API_KEY: process.env.STREAM_API_KEY ? '✓ Set' : '✗ MISSING',
      STREAM_API_SECRET: process.env.STREAM_API_SECRET ? '✓ Set' : '✗ MISSING',
      NEXT_PUBLIC_STREAM_API_KEY: process.env.NEXT_PUBLIC_STREAM_API_KEY ? '✓ Set' : '✗ MISSING',
    };
    console.error('Environment variables status:', envStatus);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate token',
        ...(process.env.NODE_ENV === 'development' && { envStatus }),
      },
      { status: 500 }
    );
  }
}
