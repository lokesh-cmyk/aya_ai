import { NextRequest, NextResponse } from 'next/server';
import { createMessageTemplate, scheduleFromTemplate } from '@/lib/scheduler';
import { MessageChannel } from '@prisma/client';
import { z } from 'zod';

const createTemplateSchema = z.object({
  name: z.string(),
  content: z.string(),
  channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL', 'TWITTER', 'FACEBOOK']),
  delayMinutes: z.number().optional(),
  delayDays: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createTemplateSchema.parse(body);

    const template = await createMessageTemplate({
      ...validated,
      channel: validated.channel as MessageChannel,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Create template error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}