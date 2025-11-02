import { NextRequest, NextResponse } from 'next/server';
import { processFacebookWebhook } from '@/lib/integrations/facebook';
import crypto from 'crypto';

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN!;
const APP_SECRET = process.env.FACEBOOK_APP_SECRET!;

// Webhook verification (GET)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// Webhook processing (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify signature
    if (signature) {
      const expectedSignature = crypto
        .createHmac('sha256', APP_SECRET)
        .update(body)
        .digest('hex');

      if (signature !== `sha256=${expectedSignature}`) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    const data = JSON.parse(body);
    await processFacebookWebhook(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Facebook webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}