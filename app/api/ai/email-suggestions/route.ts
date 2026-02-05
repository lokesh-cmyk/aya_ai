import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth, getSessionCookie } from '@/lib/auth';
import { Anthropic } from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emailContent, senderName, senderEmail, subject, threadMessages } = body;

    if (!emailContent) {
      return NextResponse.json({ error: 'Email content is required' }, { status: 400 });
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const threadContext = threadMessages?.length > 1
      ? `\n\nPrevious messages in thread:\n${threadMessages.slice(0, -1).map((m: any) =>
          `From: ${m.from || 'Unknown'}\n${m.content}`
        ).join('\n---\n')}`
      : '';

    const systemPrompt = `You are an AI assistant helping compose professional email responses.
Generate 3 different response suggestions for the email below.

Guidelines:
- Keep responses concise but complete (2-4 sentences each)
- Maintain a professional yet friendly tone
- Each suggestion should have a different approach/style
- First suggestion: Direct and professional
- Second suggestion: Warm and friendly
- Third suggestion: Brief and to-the-point

Respond ONLY with a valid JSON array of 3 strings, like:
["First response...", "Second response...", "Third response..."]`;

    const userPrompt = `Email from: ${senderName || 'Unknown'} <${senderEmail || 'unknown'}>
Subject: ${subject || '(no subject)'}
${threadContext}

Email content:
${emailContent}

Generate 3 response suggestions:`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textContent = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    let suggestions: string[] = [];
    try {
      const jsonMatch = textContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch {
      suggestions = [textContent];
    }

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      suggestions = ['Thank you for your email. I will review and get back to you shortly.'];
    }

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('[email-suggestions] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
