import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    if (!user?.teamId) {
      return NextResponse.json({
        stats: {
          totalConversations: 0,
          messagesToday: 0,
          unreadMessages: 0,
          avgResponseTime: '0m',
          upcomingMeetings: 0,
          activeTasks: 0,
          connectedIntegrations: 0,
        },
        trends: {
          conversations: { change: 0, direction: 'up' },
          messages: { change: 0, direction: 'up' },
          unread: { change: 0, direction: 'down' },
        },
        recentConversations: [],
        dailyVolume: [],
        channelDistribution: [],
      });
    }

    const teamId = user.teamId;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(todayStart);
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // Execute all queries in parallel for performance
    const [
      totalContacts,
      messagesToday,
      unreadMessages,
      thisWeekContacts,
      lastWeekContacts,
      thisWeekMessages,
      lastWeekMessages,
      upcomingMeetings,
      activeTasks,
      connectedIntegrations,
      recentContacts,
      dailyVolume,
      channelDistribution,
      responseTimeData,
    ] = await Promise.all([
      // Total contacts (conversations)
      prisma.contact.count({
        where: { teamId },
      }),

      // Messages today
      prisma.message.count({
        where: {
          contact: { teamId },
          createdAt: { gte: todayStart },
        },
      }),

      // Unread messages (inbound without readAt)
      prisma.message.count({
        where: {
          contact: { teamId },
          direction: 'INBOUND',
          readAt: null,
        },
      }),

      // This week's contacts (for trend)
      prisma.contact.count({
        where: {
          teamId,
          createdAt: { gte: thisWeekStart },
        },
      }),

      // Last week's contacts (for trend)
      prisma.contact.count({
        where: {
          teamId,
          createdAt: { gte: lastWeekStart, lt: thisWeekStart },
        },
      }),

      // This week's messages (for trend)
      prisma.message.count({
        where: {
          contact: { teamId },
          createdAt: { gte: thisWeekStart },
        },
      }),

      // Last week's messages (for trend)
      prisma.message.count({
        where: {
          contact: { teamId },
          createdAt: { gte: lastWeekStart, lt: thisWeekStart },
        },
      }),

      // Upcoming meetings (scheduled, not started yet)
      prisma.meeting.count({
        where: {
          teamId,
          status: 'SCHEDULED',
          scheduledStart: { gte: now },
        },
      }),

      // Active tasks (through spaces belonging to the team)
      prisma.task.count({
        where: {
          taskList: {
            space: { teamId },
          },
          status: {
            name: { in: ['Open', 'In Progress', 'Ready', 'Ongoing'] },
          },
        },
      }),

      // Connected integrations
      prisma.integration.count({
        where: {
          OR: [{ teamId }, { userId: session.user.id }],
          isActive: true,
        },
      }),

      // Recent contacts with latest message
      prisma.contact.findMany({
        where: { teamId },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          updatedAt: true,
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              content: true,
              channel: true,
              direction: true,
              createdAt: true,
            },
          },
        },
      }),

      // Daily message volume (last 7 days) - fetch messages and aggregate
      prisma.message.findMany({
        where: {
          contact: { teamId },
          createdAt: { gte: thisWeekStart },
        },
        select: { createdAt: true },
      }).then(messages => {
        // Aggregate by date
        const dateMap = new Map<string, number>();
        messages.forEach(m => {
          const dateKey = m.createdAt.toISOString().split('T')[0];
          dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
        });
        return Array.from(dateMap.entries()).map(([date, count]) => ({
          date,
          count,
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }).catch(() => []),

      // Channel distribution
      prisma.message.groupBy({
        by: ['channel'],
        where: {
          contact: { teamId },
          createdAt: { gte: thisWeekStart },
        },
        _count: { id: true },
      }).catch(() => []),

      // Response time calculation - simplified approach using Prisma
      (async () => {
        try {
          // Get recent inbound messages with their next outbound reply
          const inboundMessages = await prisma.message.findMany({
            where: {
              contact: { teamId },
              direction: 'INBOUND',
              createdAt: { gte: thisWeekStart },
            },
            select: {
              contactId: true,
              createdAt: true,
            },
            take: 100,
          });

          if (inboundMessages.length === 0) return [{ avg_response_minutes: 0 }];

          // For each inbound, find the next outbound
          const responseTimes: number[] = [];
          for (const inbound of inboundMessages) {
            const nextOutbound = await prisma.message.findFirst({
              where: {
                contactId: inbound.contactId,
                direction: 'OUTBOUND',
                createdAt: { gt: inbound.createdAt },
              },
              orderBy: { createdAt: 'asc' },
              select: { createdAt: true },
            });

            if (nextOutbound) {
              const diffMinutes = (nextOutbound.createdAt.getTime() - inbound.createdAt.getTime()) / (1000 * 60);
              if (diffMinutes > 0 && diffMinutes < 10080) { // Ignore responses > 1 week
                responseTimes.push(diffMinutes);
              }
            }
          }

          const avg = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;

          return [{ avg_response_minutes: avg }];
        } catch {
          return [{ avg_response_minutes: 0 }];
        }
      })(),
    ]);

    // Calculate trends (percentage change)
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) {
        return { change: current > 0 ? 100 : 0, direction: 'up' as const };
      }
      const change = Math.round(((current - previous) / previous) * 100);
      return {
        change: Math.abs(change),
        direction: change >= 0 ? 'up' as const : 'down' as const,
      };
    };

    // Format response time
    const formatResponseTime = (minutes: number | null): string => {
      if (!minutes || minutes <= 0) return '0m';
      if (minutes < 60) return `${Math.round(minutes)}m`;
      const hours = minutes / 60;
      if (hours < 24) return `${hours.toFixed(1)}h`;
      const days = hours / 24;
      return `${days.toFixed(1)}d`;
    };

    const avgResponseMinutes = (responseTimeData as any)?.[0]?.avg_response_minutes || 0;

    // Format daily volume for charts (already formatted from the query)
    const formattedDailyVolume = dailyVolume || [];

    // Format channel distribution for charts
    const formattedChannelDistribution = (channelDistribution || []).map((c: any) => ({
      channel: c.channel,
      count: c._count?.id || 0,
    }));

    // Format recent conversations
    const formattedRecentConversations = recentContacts.map((contact) => ({
      id: contact.id,
      name: contact.name || contact.email || contact.phone || 'Unknown',
      email: contact.email,
      lastMessage: contact.messages[0]?.content || 'No messages yet',
      channel: contact.messages[0]?.channel || 'EMAIL',
      direction: contact.messages[0]?.direction || 'INBOUND',
      lastMessageAt: contact.messages[0]?.createdAt || contact.updatedAt,
    }));

    return NextResponse.json({
      stats: {
        totalConversations: totalContacts,
        messagesToday,
        unreadMessages,
        avgResponseTime: formatResponseTime(avgResponseMinutes),
        upcomingMeetings,
        activeTasks,
        connectedIntegrations,
      },
      trends: {
        conversations: calculateTrend(thisWeekContacts, lastWeekContacts),
        messages: calculateTrend(thisWeekMessages, lastWeekMessages),
        unread: {
          change: unreadMessages,
          direction: unreadMessages > 0 ? 'up' as const : 'down' as const,
        },
      },
      recentConversations: formattedRecentConversations,
      dailyVolume: formattedDailyVolume,
      channelDistribution: formattedChannelDistribution,
    });
  } catch (error) {
    console.error('[Dashboard Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
