import OpenAI from "openai";

// Check for API key at initialization time
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.warn("[transcription] WARNING: OPENAI_API_KEY is not set - Whisper transcription will fail");
}

const openai = new OpenAI({
  apiKey: apiKey || "missing-key", // Provide fallback to avoid constructor error
});

export interface TranscriptionSegment {
  speaker: string;
  text: string;
  start_time: number;
  end_time: number;
}

export interface TranscriptionResult {
  full_text: string;
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
}

/**
 * Download audio file from URL and return as buffer
 */
async function downloadAudio(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Transcribe audio using OpenAI Whisper API
 * Note: Whisper has a 25MB file size limit
 */
export async function transcribeAudio(audioUrl: string): Promise<TranscriptionResult> {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set - cannot transcribe audio with Whisper");
  }

  console.log(`[transcription] Downloading audio from: ${audioUrl.substring(0, 100)}...`);

  // Download the audio file
  const audioBuffer = await downloadAudio(audioUrl);
  const fileSizeMB = audioBuffer.length / 1024 / 1024;
  console.log(`[transcription] Downloaded ${audioBuffer.length} bytes (${fileSizeMB.toFixed(2)} MB)`);

  // Check file size - Whisper has a 25MB limit
  if (fileSizeMB > 25) {
    throw new Error(`Audio file too large for Whisper API: ${fileSizeMB.toFixed(2)} MB (limit is 25MB). Use diarization instead.`);
  }

  // Determine file extension and MIME type from URL
  let fileName = "audio.mp3";
  let mimeType = "audio/mpeg";

  if (audioUrl.includes(".flac")) {
    fileName = "audio.flac";
    mimeType = "audio/flac";
  } else if (audioUrl.includes(".wav")) {
    fileName = "audio.wav";
    mimeType = "audio/wav";
  } else if (audioUrl.includes(".m4a")) {
    fileName = "audio.m4a";
    mimeType = "audio/m4a";
  } else if (audioUrl.includes(".mp4")) {
    fileName = "audio.mp4";
    mimeType = "audio/mp4";
  } else if (audioUrl.includes(".webm")) {
    fileName = "audio.webm";
    mimeType = "audio/webm";
  }

  console.log(`[transcription] Detected audio format: ${fileName} (${mimeType})`);

  // Create a File object for OpenAI API
  // Convert Buffer to Uint8Array for File constructor compatibility
  const audioFile = new File([new Uint8Array(audioBuffer)], fileName, { type: mimeType });

  console.log(`[transcription] Sending to OpenAI Whisper (${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);

  try {
    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    console.log(`[transcription] Received transcription: ${transcription.text?.substring(0, 100)}...`);

    // Parse segments from Whisper response
    const segments: TranscriptionSegment[] = [];

    if (transcription.segments) {
      for (const seg of transcription.segments) {
        segments.push({
          speaker: "Speaker", // Whisper doesn't provide speaker diarization
          text: seg.text,
          start_time: seg.start,
          end_time: seg.end,
        });
      }
    }

    return {
      full_text: transcription.text,
      segments,
      language: transcription.language || "en",
      duration: transcription.duration || 0,
    };
  } catch (error) {
    console.error(`[transcription] Whisper API error:`, error);
    throw new Error(`Whisper transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse diarization JSONL file from MeetingBaas
 * Diarization format: {"speaker": "Lokesh", "text": "...", "start_time": 0.0, "end_time": 1.5}
 * Or legacy format: {"speaker": "Lokesh", "text": "...", "start": 0.0, "end": 1.5}
 */
export async function parseDiarization(diarizationUrl: string): Promise<TranscriptionResult> {
  console.log(`[transcription] Downloading diarization from: ${diarizationUrl.substring(0, 100)}...`);

  const response = await fetch(diarizationUrl);
  if (!response.ok) {
    throw new Error(`Failed to download diarization: ${response.status}`);
  }

  const text = await response.text();
  console.log(`[transcription] Diarization file size: ${text.length} bytes`);
  console.log(`[transcription] Diarization first 500 chars: ${text.substring(0, 500)}`);

  return parseDiarizationText(text);
}

/**
 * Parse diarization from text content
 */
function parseDiarizationText(text: string): TranscriptionResult {
  const lines = text.trim().split("\n").filter(line => line.trim());
  console.log(`[transcription] Diarization has ${lines.length} lines to parse`);

  const segments: TranscriptionSegment[] = [];
  let fullText = "";
  let maxEndTime = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    try {
      const entry = JSON.parse(line);

      // Log first few entries to see the actual format
      if (i < 3) {
        console.log(`[transcription] Line ${i} parsed:`, JSON.stringify(entry).substring(0, 200));
      }

      // MeetingBaas v2 might use different field names - check all possibilities
      const entryText = entry.text || entry.transcript || entry.content || entry.message || "";
      const speaker = entry.speaker || entry.speaker_name || entry.user || entry.name || "Unknown";
      const startTime = entry.start_time ?? entry.start ?? entry.timestamp ?? 0;
      const endTime = entry.end_time ?? entry.end ?? (startTime + 1);

      if (entryText && entryText.trim()) {
        segments.push({
          speaker: speaker,
          text: entryText.trim(),
          start_time: startTime,
          end_time: endTime,
        });

        fullText += (fullText ? " " : "") + entryText.trim();
        maxEndTime = Math.max(maxEndTime, endTime);
      }
    } catch (e) {
      // Only warn for first few failures to avoid log spam
      if (i < 5) {
        console.warn(`[transcription] Failed to parse line ${i}: ${line.substring(0, 100)}...`);
      }
    }
  }

  console.log(`[transcription] Parsed ${segments.length} segments from diarization`);
  console.log(`[transcription] Total text length: ${fullText.length} chars`);
  console.log(`[transcription] Total duration: ${maxEndTime}s`);

  // If we got 0 segments, log more details
  if (segments.length === 0 && lines.length > 0) {
    console.error(`[transcription] WARNING: Got 0 segments from ${lines.length} lines!`);
    console.error(`[transcription] First line raw: ${lines[0]?.substring(0, 300)}`);
  }

  return {
    full_text: fullText,
    segments,
    language: "en",
    duration: maxEndTime,
  };
}

/**
 * Get transcript - prioritizes diarization (has speaker info from MeetingBaas),
 * falls back to audio transcription with Whisper
 */
export async function getTranscript(
  transcriptionUrl: string | null | undefined,
  diarizationUrl: string | null | undefined,
  audioUrl: string | null | undefined
): Promise<TranscriptionResult | null> {
  console.log(`[transcription] getTranscript called with:`);
  console.log(`[transcription]   - transcriptionUrl: ${transcriptionUrl ? 'yes' : 'no'}`);
  console.log(`[transcription]   - diarizationUrl: ${diarizationUrl ? 'yes' : 'no'}`);
  console.log(`[transcription]   - audioUrl: ${audioUrl ? 'yes' : 'no'}`);

  let diarizationResult: TranscriptionResult | null = null;
  let whisperResult: TranscriptionResult | null = null;
  const errors: string[] = [];

  // PRIORITY 1: Try diarization first - it has speaker names from MeetingBaas
  if (diarizationUrl) {
    try {
      console.log(`[transcription] Parsing diarization (has speaker names)...`);
      diarizationResult = await parseDiarization(diarizationUrl);
      console.log(`[transcription] Diarization SUCCESS: ${diarizationResult.segments.length} segments, ${diarizationResult.full_text.length} chars`);

      // If diarization has good content, use it directly
      if (diarizationResult.full_text.length > 100) {
        console.log(`[transcription] Using diarization as primary transcript (has speaker labels)`);
        return diarizationResult;
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      console.error(`[transcription] Diarization FAILED: ${errorMsg}`);
      errors.push(`Diarization: ${errorMsg}`);
    }
  }

  // PRIORITY 2: Try existing transcription URL
  if (transcriptionUrl && !transcriptionUrl.includes("diarization")) {
    try {
      console.log(`[transcription] Fetching existing transcription...`);
      const response = await fetch(transcriptionUrl);
      if (response.ok) {
        const text = await response.text();
        // Check if it's JSONL (multiple lines) or regular JSON
        if (text.trim().includes("\n") && text.trim().startsWith("{")) {
          // It's JSONL, parse as diarization
          console.log(`[transcription] Detected JSONL format, parsing as diarization...`);
          const parsed = parseDiarizationText(text);
          if (parsed.full_text.length > 100) {
            console.log(`[transcription] Using transcription URL as diarization: ${parsed.full_text.length} chars`);
            return parsed;
          }
          if (!diarizationResult || parsed.full_text.length > diarizationResult.full_text.length) {
            diarizationResult = parsed;
          }
        } else {
          // Regular JSON - this is a proper transcription, use it
          const data = JSON.parse(text);
          if ((data as TranscriptionResult).full_text?.length > 100) {
            console.log(`[transcription] Using existing transcription: ${(data as TranscriptionResult).full_text.length} chars`);
            return data as TranscriptionResult;
          }
        }
      } else {
        errors.push(`Transcription URL: HTTP ${response.status}`);
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      console.warn(`[transcription] Transcription URL FAILED: ${errorMsg}`);
      errors.push(`Transcription URL: ${errorMsg}`);
    }
  }

  // PRIORITY 3: Transcribe audio with Whisper (expensive, large files)
  if (audioUrl) {
    try {
      console.log(`[transcription] Transcribing audio with OpenAI Whisper...`);
      whisperResult = await transcribeAudio(audioUrl);
      console.log(`[transcription] Whisper SUCCESS: ${whisperResult.full_text.length} chars`);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      console.error(`[transcription] Whisper FAILED: ${errorMsg}`);
      errors.push(`Whisper: ${errorMsg}`);
    }
  }

  // Combine results if we have both
  if (whisperResult && diarizationResult) {
    console.log(`[transcription] Combining Whisper + diarization for best result`);
    return {
      full_text: whisperResult.full_text.length > diarizationResult.full_text.length
        ? whisperResult.full_text
        : diarizationResult.full_text,
      segments: diarizationResult.segments, // Use diarization for speaker names
      language: whisperResult.language || diarizationResult.language,
      duration: Math.max(whisperResult.duration, diarizationResult.duration),
    };
  }

  // Return whichever we have
  if (whisperResult) {
    console.log(`[transcription] Returning Whisper result only`);
    return whisperResult;
  }

  if (diarizationResult) {
    console.log(`[transcription] Returning diarization result only`);
    return diarizationResult;
  }

  // All methods failed
  console.error(`[transcription] ALL METHODS FAILED. Errors: ${errors.join('; ')}`);
  return null;
}
