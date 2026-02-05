/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { SlackClient } from '@/lib/integrations/slack';

// GET: Fetch Slack messages from selected channels
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const slackClient = new SlackClient(session.user.id, user?.teamId || null);
    const messages = await slackClient.fetchMessages(limit);

    // Transform messages to contact format for unified inbox
    const contactsMap = new Map<string, any>();
    const userInfoCache = new Map<string, any>();

    for (const message of messages) {
      const channelId = message.metadata?.channelId || 'unknown';
      const channelName = message.metadata?.channelName || 'Unknown Channel';
      const userId = message.metadata?.userId || 'unknown';

      // Fetch user info if not cached
      let userInfo = userInfoCache.get(userId);
      if (!userInfo && userId !== 'unknown') {
        try {
          userInfo = await slackClient.getUserInfo(userId);
          if (userInfo) {
            userInfoCache.set(userId, userInfo);
          }
        } catch (err) {
          console.warn(`[slack/messages] Failed to fetch user info for ${userId}:`, err);
        }
      }

      // Create a contact key based on channel (group messages by channel)
      const contactKey = `slack_${channelId}`;

      if (!contactsMap.has(contactKey)) {
        contactsMap.set(contactKey, {
          id: contactKey,
          name: channelName || `Channel ${channelId}`,
          email: undefined,
          phone: undefined,
          messages: [],
          _count: { messages: 0 },
          isSlack: true,
          channelId,
          channelName,
        });
      }

      const contact = contactsMap.get(contactKey)!;
      
      // Add user info to message metadata
      const messageWithUser = {
        ...message,
        readAt: null,
        metadata: {
          ...message.metadata,
          userName: userInfo?.name || userInfo?.real_name || 'Unknown User',
          userEmail: userInfo?.email,
        },
        from: userInfo?.name || userInfo?.real_name || `User ${userId}`,
      };
      
      contact.messages.push(messageWithUser);
      contact._count.messages = contact.messages.length;
    }

    const contacts = Array.from(contactsMap.values());

    console.log(`[slack/messages] Returning ${contacts.length} contacts with ${contacts.reduce((sum, c) => sum + (c.messages?.length || 0), 0)} total messages`);

    return NextResponse.json({
      contacts,
      total: contacts.length,
      messageCount: contacts.reduce((sum, c) => sum + (c.messages?.length || 0), 0),
    });
  } catch (error: any) {
    console.error('[slack/messages] Error:', error);
    // Don't throw error - return empty array if Slack is not connected
    if (error.message?.includes('not found') || error.message?.includes('not connected')) {
      return NextResponse.json({
        contacts: [],
      });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Slack messages' },
      { status: 500 }
    );
  }
}
