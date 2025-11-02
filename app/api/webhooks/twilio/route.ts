import { NextRequest, NextResponse } from 'next/server';
import { processTwilioWebhook, handleTwilioStatus } from '@/lib/integrations/twilio';
import twilio from 'twilio';

const authToken = process.env.TWILIO_AUTH_TOKEN!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const data = Object.fromEntries(params);

    // Validate Twilio signature
    const signature = request.headers.get('x-twilio-signature') || '';
    const url = request.url;

    const isValid = twilio.validateRequest(
      authToken,
      signature,
      url,
      data
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }

    // Process webhook
    const message = await processTwilioWebhook(data);

    // Return TwiML response
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  } catch (error) {
    console.error('Twilio webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
