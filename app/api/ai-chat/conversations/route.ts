import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth, getSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: List all conversations for the user
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await prisma.aIChatConversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Get first message for preview
        },
      },
    });

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error('[ai-chat/conversations] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST: Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, model } = body;

    const conversation = await prisma.aIChatConversation.create({
      data: {
        userId: session.user.id,
        title: title || 'New Conversation',
        model: model || 'sonnet-4.6',
      },
    });

    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error('[ai-chat/conversations] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
