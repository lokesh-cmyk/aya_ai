import { NextRequest, NextResponse } from 'next/server';
import { handleTwilioStatus } from '@/lib/integrations/twilio';
import twilio from 'twilio';

const authToken = process.env.TWILIO_AUTH_TOKEN!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const data = Object.fromEntries(params);

    // Validate signature
    const signature = request.headers.get('x-twilio-signature') || '';
    const url = request.url;

    const isValid = twilio.validateRequest(authToken, signature, url, data);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    await handleTwilioStatus(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Twilio status webhook error:', error);
    return NextResponse.json({ error: 'Status update failed' }, { status: 500 });
  }
}