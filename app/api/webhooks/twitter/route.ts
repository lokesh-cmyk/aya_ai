import { NextRequest, NextResponse } from 'next/server';
import { processTwitterWebhook } from '@/lib/integrations/twitter';
import crypto from 'crypto';

const CONSUMER_SECRET = process.env.TWITTER_CONSUMER_SECRET!;

// CRC Challenge (GET)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const crcToken = searchParams.get('crc_token');

  if (crcToken) {
    const hash = crypto
      .createHmac('sha256', CONSUMER_SECRET)
      .update(crcToken)
      .digest('base64');

    return NextResponse.json({
      response_token: `sha256=${hash}`,
    });
  }

  return NextResponse.json({ error: 'No CRC token' }, { status: 400 });
}

// Webhook processing (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-twitter-webhooks-signature');

    // Verify signature
    if (signature) {
      const bodyStr = JSON.stringify(body);
      const expectedSignature = crypto
        .createHmac('sha256', CONSUMER_SECRET)
        .update(bodyStr)
        .digest('base64');

      if (signature !== `sha256=${expectedSignature}`) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    await processTwitterWebhook(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Twitter webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}