/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MessageChannel, MessageDirection, MessageStatus } from '@/app/generated/prisma/enums';


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

    // Response time analysis - simplified approach using Prisma
    let avgResponseTime = 0;
    try {
      const inboundMessages = await prisma.message.findMany({
        where: {
          direction: 'INBOUND',
          ...dateFilter,
        },
        select: {
          contactId: true,
          sentAt: true,
          createdAt: true,
        },
        take: 50,
      });

      const responseTimes: number[] = [];
      for (const inbound of inboundMessages) {
        const nextOutbound = await prisma.message.findFirst({
          where: {
            contactId: inbound.contactId,
            direction: 'OUTBOUND',
            sentAt: { gt: inbound.sentAt || inbound.createdAt },
          },
          orderBy: { sentAt: 'asc' },
          select: { sentAt: true },
        });

        if (nextOutbound?.sentAt && inbound.sentAt) {
          const diffSeconds = (nextOutbound.sentAt.getTime() - inbound.sentAt.getTime()) / 1000;
          if (diffSeconds > 0 && diffSeconds < 604800) { // Ignore > 1 week
            responseTimes.push(diffSeconds);
          }
        }
      }

      avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;
    } catch (e) {
      console.error('Response time calculation error:', e);
      avgResponseTime = 0;
    }

    // Daily message volume - using Prisma instead of raw SQL
    let dailyVolume: Array<{ date: Date; count: number }> = [];
    try {
      const messages = await prisma.message.findMany({
        where: {
          ...dateFilter,
          ...channelFilter,
        },
        select: {
          createdAt: true,
        },
      });

      // Aggregate by date
      const dateMap = new Map<string, number>();
      messages.forEach(m => {
        const dateKey = m.createdAt.toISOString().split('T')[0];
        dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
      });

      dailyVolume = Array.from(dateMap.entries())
        .map(([date, count]) => ({
          date: new Date(date),
          count,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (e) {
      console.error('Daily volume calculation error:', e);
      dailyVolume = [];
    }

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
    funnelData.forEach((item: { channel: string | number; status: string; _count: { id: any; }; }) => {
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

    // Channel performance metrics - with error handling
    let channelMetrics: any[] = [];
    try {
      channelMetrics = await Promise.all(
        Object.values(MessageChannel).map(async (ch) => {
          try {
            const totalMessages = await prisma.message.count({
              where: {
                channel: ch,
                ...dateFilter,
              }
            });

            if (totalMessages === 0) {
              return {
                channel: ch,
                totalMessages: 0,
                failedMessages: 0,
                successRate: 100,
                avgDeliveryTime: 0,
              };
            }

            const failedMessages = await prisma.message.count({
              where: {
                channel: ch,
                ...dateFilter,
                status: MessageStatus.FAILED,
              }
            });

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
              },
              take: 100, // Limit for performance
            });

            const deliveryTimes = messages
              .filter((m) => m.sentAt && m.deliveredAt)
              .map((m) => m.deliveredAt!.getTime() - m.sentAt!.getTime());

            const avgDeliveryTime = deliveryTimes.length > 0
              ? deliveryTimes.reduce((sum, t) => sum + t, 0) / deliveryTimes.length / 1000
              : 0;

            return {
              channel: ch,
              totalMessages,
              failedMessages,
              successRate: totalMessages > 0 ? ((totalMessages - failedMessages) / totalMessages) * 100 : 100,
              avgDeliveryTime,
            };
          } catch (e) {
            console.error(`Error calculating metrics for ${ch}:`, e);
            return {
              channel: ch,
              totalMessages: 0,
              failedMessages: 0,
              successRate: 100,
              avgDeliveryTime: 0,
            };
          }
        })
      );
    } catch (e) {
      console.error('Channel metrics calculation error:', e);
      channelMetrics = [];
    }

    return NextResponse.json({
      summary: {
        totalMessages: messagesByChannel.reduce((sum: any, item: { _count: { id: any; }; }) => sum + item._count.id, 0),
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