import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { rawText, cleanupPrompt, context } = await request.json();

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({
        cleanedText: '',
        originalText: rawText,
        wasModified: false
      });
    }

    const trimmedText = rawText.trim();
    const wordCount = trimmedText.split(/\s+/).length;

    // Skip cleanup for very short, clear text (less than 8 words, no obvious filler)
    const fillerPattern = /\b(um|uh|uhh|umm|like|you know|basically|actually|so yeah|i mean)\b/i;
    const hasFillers = fillerPattern.test(trimmedText);
    const hasRepetition = /(\b\w+\b)(\s+\1){2,}/i.test(trimmedText);

    if (wordCount < 8 && !hasFillers && !hasRepetition) {
      return NextResponse.json({
        cleanedText: trimmedText,
        originalText: rawText,
        wasModified: false
      });
    }

    const systemPrompt = `You are a text cleanup assistant that processes dictated speech. Your job is to clean up the text while preserving the user's exact meaning and intent.

RULES:
1. Remove filler words: um, uh, uhh, umm, like (when used as filler), you know, basically, actually, so yeah, I mean
2. Fix obvious speech-to-text errors (e.g., "their" vs "there" based on context)
3. Remove unnecessary repetitions and false starts
4. Consolidate rambling into clear, concise sentences
5. Fix punctuation and capitalization
6. PRESERVE the user's voice, tone, and personality
7. DO NOT add information they didn't say
8. DO NOT change the meaning or intent
9. DO NOT make the text overly formal if the original was casual
10. If the text is already clear, return it with minimal changes

${cleanupPrompt ? `\nADDITIONAL INSTRUCTIONS: ${cleanupPrompt}` : ''}
${context ? `\nCONTEXT (what they're writing): ${context}` : ''}

Return ONLY the cleaned text. No explanations, no quotes, no prefixes like "Here's the cleaned text:". Just the cleaned text itself.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: trimmedText }
      ]
    });

    const cleanedText = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : trimmedText;

    return NextResponse.json({
      cleanedText,
      originalText: rawText,
      wasModified: cleanedText.toLowerCase() !== trimmedText.toLowerCase()
    });

  } catch (error) {
    console.error('[dictation/cleanup] Error:', error);

    // Return original text on error (graceful degradation)
    const body = await request.clone().json().catch(() => ({}));
    return NextResponse.json({
      cleanedText: body.rawText?.trim() || '',
      originalText: body.rawText || '',
      wasModified: false,
      error: 'Cleanup failed, returning original text'
    });
  }
}
