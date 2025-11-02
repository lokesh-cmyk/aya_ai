// app/api/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MessageChannel, MessageStatus, MessageDirection } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const channel = searchParams.get('channel');

    const dateFilter = {
      createdAt: {
        gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lte: endDate ? new Date(endDate) : new Date(),
      }
    };

    const channelFilter = channel ? { channel: channel as MessageChannel } : {};

    // Message volume by channel
    const messagesByChannel = await prisma.message.groupBy({
      by: ['channel'],
      where: { ...dateFilter, ...channelFilter },
      _count: {
        id: true,
      }
    });

    // Message status breakdown
    const messagesByStatus = await prisma.message.groupBy({
      by: ['status'],
      where: { ...dateFilter, ...channelFilter },
      _count: {
        id: true,
      }
    });

    // Inbound vs Outbound
    const messagesByDirection = await prisma.message.groupBy({
      by: ['direction'],
      where: { ...dateFilter, ...channelFilter },
      _count: {
        id: true,
      }
    });

    // Response time analysis (time between inbound and first outbound reply)
    const responseTimes = await prisma.$queryRaw<Array<{
      contactId: string;
      avgResponseTime: number;
    }>>`
      SELECT 
        "contactId",
        AVG(EXTRACT(EPOCH FROM (outbound."sentAt" - inbound."sentAt"))) as "avgResponseTime"
      FROM "Message" inbound
      INNER JOIN "Message" outbound 
        ON inbound."contactId" = outbound."contactId"
        AND outbound."direction" = 'OUTBOUND'
        AND outbound."sentAt" > inbound."sentAt"
      WHERE 
        inbound."direction" = 'INBOUND'
        AND inbound."createdAt" >= ${dateFilter.createdAt.gte}
        AND inbound."createdAt" <= ${dateFilter.createdAt.lte}
      GROUP BY inbound."contactId"
    `;

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, rt) => sum + Number(rt.avgResponseTime), 0) / responseTimes.length
      : 0;

    // Daily message volume
    const dailyVolume = await prisma.$queryRaw<Array<{
      date: Date;
      count: number;
    }>>`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*)::int as count
      FROM "Message"
      WHERE 
        "createdAt" >= ${dateFilter.createdAt.gte}
        AND "createdAt" <= ${dateFilter.createdAt.lte}
        ${channel ? prisma.$queryRawUnsafe(`AND "channel" = '${channel}'`) : prisma.$queryRawUnsafe('')}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Conversion funnel (sent -> delivered -> read)
    const funnelData = await prisma.message.groupBy({
      by: ['channel', 'status'],
      where: {
        ...dateFilter,
        ...channelFilter,
        direction: MessageDirection.OUTBOUND,
      },
      _count: {
        id: true,
      }
    });

    const funnel: Record<string, any> = {};
    funnelData.forEach(item => {
      if (!funnel[item.channel]) {
        funnel[item.channel] = {
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
        };
      }
      
      const status = item.status.toLowerCase();
      funnel[item.channel][status] = item._count.id;
    });

    // Top contacts by message volume
    const topContacts = await prisma.contact.findMany({
      where: {
        messages: {
          some: dateFilter,
        }
      },
      include: {
        _count: {
          select: {
            messages: true,
          }
        }
      },
      orderBy: {
        messages: {
          _count: 'desc',
        }
      },
      take: 10,
    });

    // Channel performance metrics
    const channelMetrics = await Promise.all(
      Object.values(MessageChannel).map(async (ch) => {
        const messages = await prisma.message.findMany({
          where: {
            channel: ch,
            ...dateFilter,
            direction: MessageDirection.OUTBOUND,
            sentAt: { not: null },
            deliveredAt: { not: null },
          },
          select: {
            sentAt: true,
            deliveredAt: true,
          }
        });

        const deliveryTimes = messages
          .filter(m => m.sentAt && m.deliveredAt)
          .map(m => {
            return m.deliveredAt!.getTime() - m.sentAt!.getTime();
          });

        const avgDeliveryTime = deliveryTimes.length > 0
          ? deliveryTimes.reduce((sum, t) => sum + t, 0) / deliveryTimes.length / 1000
          : 0;

        const totalMessages = await prisma.message.count({
          where: {
            channel: ch,
            ...dateFilter,
          }
        });

        const failedMessages = await prisma.message.count({
          where: {
            channel: ch,
            ...dateFilter,
            status: MessageStatus.FAILED,
          }
        });

        return {
          channel: ch,
          totalMessages,
          failedMessages,
          successRate: totalMessages > 0 ? ((totalMessages - failedMessages) / totalMessages) * 100 : 0,
          avgDeliveryTime,
        };
      })
    );

    return NextResponse.json({
      summary: {
        totalMessages: messagesByChannel.reduce((sum, item) => sum + item._count.id, 0),
        avgResponseTime: Math.round(avgResponseTime),
        channels: messagesByChannel.length,
      },
      messagesByChannel,
      messagesByStatus,
      messagesByDirection,
      dailyVolume,
      conversionFunnel: funnel,
      topContacts,
      channelMetrics,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}