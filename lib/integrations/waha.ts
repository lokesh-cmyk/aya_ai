/* eslint-disable @typescript-eslint/no-explicit-any */

const WAHA_API_URL = process.env.WAHA_API_URL || "http://localhost:3000";
const WAHA_API_KEY = process.env.WAHA_API_KEY || "";
const WAHA_SESSION = process.env.WAHA_SESSION_NAME || "default";

/**
 * Base fetch wrapper for WAHA API calls
 */
async function wahaFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${WAHA_API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": WAHA_API_KEY,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "Unknown error");
    throw new Error(`WAHA API error ${res.status}: ${errorBody}`);
  }

  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

/**
 * Format phone number to WhatsApp chat ID
 * Strips +, spaces, dashes. Appends @c.us if not present.
 */
export function toChatId(phone: string): string {
  const cleaned = phone.replace(/[+\s\-()]/g, "");
  if (cleaned.includes("@")) return cleaned;
  return `${cleaned}@c.us`;
}

/**
 * Extract phone number from chat ID
 */
export function fromChatId(chatId: string): string {
  return chatId.replace("@c.us", "").replace("@s.whatsapp.net", "");
}

// ============================================
// Messaging
// ============================================

export async function sendText(
  chatId: string,
  text: string,
  session: string = WAHA_SESSION
): Promise<any> {
  return wahaFetch("/api/sendText", {
    method: "POST",
    body: JSON.stringify({
      chatId,
      text,
      session,
    }),
  });
}

export async function sendVoice(
  chatId: string,
  file: { url?: string; data?: string; mimetype?: string },
  session: string = WAHA_SESSION
): Promise<any> {
  return wahaFetch("/api/sendVoice", {
    method: "POST",
    body: JSON.stringify({
      chatId,
      file,
      session,
    }),
  });
}

export async function sendImage(
  chatId: string,
  file: { url?: string; data?: string; mimetype?: string },
  caption?: string,
  session: string = WAHA_SESSION
): Promise<any> {
  return wahaFetch("/api/sendImage", {
    method: "POST",
    body: JSON.stringify({
      chatId,
      file,
      caption,
      session,
    }),
  });
}

export async function sendFile(
  chatId: string,
  file: { url?: string; data?: string; mimetype?: string; filename?: string },
  caption?: string,
  session: string = WAHA_SESSION
): Promise<any> {
  return wahaFetch("/api/sendFile", {
    method: "POST",
    body: JSON.stringify({
      chatId,
      file,
      caption,
      session,
    }),
  });
}

// ============================================
// Typing Indicators & Read Receipts
// ============================================

export async function startTyping(
  chatId: string,
  session: string = WAHA_SESSION
): Promise<void> {
  await wahaFetch("/api/startTyping", {
    method: "POST",
    body: JSON.stringify({ chatId, session }),
  });
}

export async function stopTyping(
  chatId: string,
  session: string = WAHA_SESSION
): Promise<void> {
  await wahaFetch("/api/stopTyping", {
    method: "POST",
    body: JSON.stringify({ chatId, session }),
  });
}

export async function sendSeen(
  chatId: string,
  messageId: string,
  session: string = WAHA_SESSION
): Promise<void> {
  await wahaFetch("/api/sendSeen", {
    method: "POST",
    body: JSON.stringify({ chatId, messageId, session }),
  });
}

// ============================================
// Contacts
// ============================================

export async function checkNumberStatus(
  phone: string,
  session: string = WAHA_SESSION
): Promise<{ numberExists: boolean }> {
  const chatId = toChatId(phone);
  return wahaFetch(
    `/api/contacts/check-exists?phone=${chatId}&session=${session}`
  );
}

// ============================================
// Media Conversion
// ============================================

export async function convertVoice(
  audioBase64: string,
  mimetype: string = "audio/mp3",
  session: string = WAHA_SESSION
): Promise<{ data: string; mimetype: string }> {
  return wahaFetch(`/api/${session}/media/convert/voice`, {
    method: "POST",
    body: JSON.stringify({
      file: {
        data: audioBase64,
        mimetype,
      },
    }),
  });
}

// ============================================
// Session Management
// ============================================

export async function getSessionStatus(
  session: string = WAHA_SESSION
): Promise<any> {
  return wahaFetch(`/api/sessions/${session}`);
}

export async function restartSession(
  session: string = WAHA_SESSION
): Promise<any> {
  return wahaFetch(`/api/sessions/${session}/restart`, { method: "POST" });
}

export async function createSession(
  name: string,
  config: any = {}
): Promise<any> {
  return wahaFetch("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ name, config }),
  });
}

/**
 * Configure webhook for a WAHA session
 */
export async function configureWebhook(
  webhookUrl: string,
  secret?: string,
  session: string = WAHA_SESSION
): Promise<any> {
  const webhookConfig: any = {
    url: webhookUrl,
    events: ["message", "session.status"],
  };
  if (secret) {
    webhookConfig.hmac = { key: secret };
  }

  return wahaFetch(`/api/sessions/${session}`, {
    method: "PUT",
    body: JSON.stringify({
      config: {
        webhooks: [webhookConfig],
      },
    }),
  });
}
