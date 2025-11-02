import { NextRequest, NextResponse } from 'next/server';
import { processScheduledMessages } from '@/lib/scheduler';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await processScheduledMessages();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Scheduler process error:', error);
    return NextResponse.json(
      { error: 'Failed to process scheduled messages' },
      { status: 500 }
    );
  }
}