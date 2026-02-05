import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  getMemories,
  deleteMemory,
  searchMemories,
  getMemoryHistory,
  isMem0Configured,
} from '@/lib/mem0';

/**
 * GET /api/ai-chat/memories
 * Fetch all memories for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Check if mem0 is configured
    if (!isMem0Configured()) {
      return Response.json(
        { error: 'Memory service is not configured' },
        { status: 503 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('better-auth.session_token');

    if (!sessionCookie) {
      return Response.json(
        { error: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return Response.json(
        { error: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const query = searchParams.get('query');

    let memories;

    if (query) {
      // Search memories if query is provided
      memories = await searchMemories(session.user.id, query, {
        top_k: pageSize,
        threshold: 0.2,
      });
    } else {
      // Get all memories
      memories = await getMemories(session.user.id, {
        page,
        page_size: pageSize,
      });
    }

    return Response.json({
      memories,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error('[ai-chat/memories] GET error:', error);
    return Response.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-chat/memories
 * Delete a specific memory
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check if mem0 is configured
    if (!isMem0Configured()) {
      return Response.json(
        { error: 'Memory service is not configured' },
        { status: 503 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('better-auth.session_token');

    if (!sessionCookie) {
      return Response.json(
        { error: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return Response.json(
        { error: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { memoryId } = body;

    if (!memoryId) {
      return Response.json(
        { error: 'Memory ID is required' },
        { status: 400 }
      );
    }

    await deleteMemory(memoryId);

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('[ai-chat/memories] DELETE error:', error);
    return Response.json(
      { error: 'Failed to delete memory' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-chat/memories/history
 * Get history for a specific memory
 */
export async function POST(request: NextRequest) {
  try {
    // Check if mem0 is configured
    if (!isMem0Configured()) {
      return Response.json(
        { error: 'Memory service is not configured' },
        { status: 503 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('better-auth.session_token');

    if (!sessionCookie) {
      return Response.json(
        { error: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return Response.json(
        { error: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { memoryId } = body;

    if (!memoryId) {
      return Response.json(
        { error: 'Memory ID is required' },
        { status: 400 }
      );
    }

    const history = await getMemoryHistory(memoryId);

    return Response.json({ history });
  } catch (error: any) {
    console.error('[ai-chat/memories] POST error:', error);
    return Response.json(
      { error: 'Failed to fetch memory history' },
      { status: 500 }
    );
  }
}
