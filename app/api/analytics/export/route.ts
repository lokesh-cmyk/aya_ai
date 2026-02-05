/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json';

    const dateFilter = {
      createdAt: {
        gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lte: endDate ? new Date(endDate) : new Date(),
      }
    };

    const messages = await prisma.message.findMany({
      where: dateFilter,
      include: {
        contact: {
          select: {
            name: true,
            phone: true,
            email: true,
          }
        },
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Date', 'Channel', 'Direction', 'Status', 'Contact', 'Content', 'User'];
      const rows = messages.map((m) => [
        m.createdAt.toISOString(),
        m.channel,
        m.direction,
        m.status,
        m.contact.name || m.contact.phone || m.contact.email || 'Unknown',
        (m.content || '').replace(/,/g, ';').substring(0, 100),
        m.user?.name || 'System',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.join(','))
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="messages-export-${Date.now()}.csv"`,
        }
      });
    }

    return NextResponse.json({
      messages,
      exportedAt: new Date().toISOString(),
      totalRecords: messages.length,
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}