import OpenAI from "openai";
import { convertVoice } from "@/lib/integrations/waha";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "tts-1";
const TTS_VOICE = (process.env.OPENAI_TTS_VOICE || "nova") as
  | "alloy"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "shimmer";

/**
 * Generate a voice note from text using OpenAI TTS.
 * Returns base64-encoded OGG/Opus audio ready for WAHA sendVoice.
 */
export async function generateVoiceNote(text: string): Promise<{
  data: string;
  mimetype: string;
}> {
  // Generate MP3 via OpenAI TTS
  const mp3Response = await openai.audio.speech.create({
    model: TTS_MODEL,
    voice: TTS_VOICE,
    input: text,
    response_format: "mp3",
  });

  const mp3Buffer = Buffer.from(await mp3Response.arrayBuffer());
  const mp3Base64 = mp3Buffer.toString("base64");

  // Convert MP3 to OGG/Opus via WAHA's built-in converter
  try {
    const converted = await convertVoice(mp3Base64, "audio/mp3");
    return {
      data: converted.data,
      mimetype: converted.mimetype || "audio/ogg; codecs=opus",
    };
  } catch (error) {
    // Fallback: send MP3 directly (WAHA may accept it)
    console.warn("[voice] WAHA conversion failed, sending MP3 directly:", error);
    return {
      data: mp3Base64,
      mimetype: "audio/mp3",
    };
  }
}

/**
 * Condense a digest into a natural spoken summary suitable for TTS.
 * Uses Claude to rewrite structured data as conversational speech.
 */
export async function generateSpeechScript(
  digestText: string,
  userName: string,
  language: string = "en"
): Promise<string> {
  const { generateText } = await import("ai");
  const { anthropic } = await import("@ai-sdk/anthropic");

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: `You are a friendly AI assistant converting a daily digest into a natural spoken summary for a voice note. Keep it under 60 seconds when spoken (~150 words). Be warm, conversational, and highlight the most important items. Respond in ${language === "en" ? "English" : `the language with code: ${language}`}. Do NOT include any markdown formatting.`,
    prompt: `Convert this daily digest for ${userName} into a spoken summary:\n\n${digestText}`,
  });

  return text;
}
