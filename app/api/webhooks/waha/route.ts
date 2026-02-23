/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { inngest } from "@/lib/inngest/client";
import {
  sendText,
  toChatId,
  fromChatId,
} from "@/lib/integrations/waha";
import {
  findUserByPhone,
  linkPhoneByEmail,
  extractEmail,
} from "@/lib/whatsapp/user-linker";
import { classifyIntent } from "@/lib/whatsapp/classifier";
import { processMessage } from "@/lib/whatsapp/processor";

const WEBHOOK_SECRET = process.env.WAHA_WEBHOOK_SECRET;

/**
 * Verify HMAC signature from WAHA webhook
 */
function verifyHmac(body: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return !WEBHOOK_SECRET; // Skip if no secret configured
  const expected = createHmac("sha512", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify HMAC signature
  const signature = request.headers.get("x-hmac-sha512");
  if (!verifyHmac(rawBody, signature)) {
    console.warn("[waha-webhook] Invalid HMAC signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only process incoming messages (not our own outbound)
  const event = data.event;
  if (event !== "message") {
    // Handle session.status events for monitoring
    if (event === "session.status") {
      console.log("[waha-webhook] Session status:", data.payload?.status);
    }
    return NextResponse.json({ ok: true });
  }

  const payload = data.payload;
  if (!payload || payload.fromMe) {
    // Ignore our own messages
    return NextResponse.json({ ok: true });
  }

  const chatId = payload.from;
  const messageBody = payload.body || "";
  const wahaMessageId = payload.id;

  // Only handle direct messages (not groups)
  if (chatId?.includes("@g.us")) {
    return NextResponse.json({ ok: true });
  }

  const phone = fromChatId(chatId);

  // Process message and then respond
  // We await here to ensure the serverless function stays alive until processing completes.
  // WAHA does not require a fast webhook response — any 2xx is fine.
  try {
    await handleIncomingMessage(phone, messageBody, wahaMessageId, payload);
  } catch (error) {
    console.error("[waha-webhook] Processing error:", error);
  }

  return NextResponse.json({ ok: true });
}

async function handleIncomingMessage(
  phone: string,
  messageBody: string,
  wahaMessageId: string | null,
  payload: any
) {
  const chatId = toChatId(phone);

  // Handle voice messages — transcribe first
  let messageText = messageBody;
  if (payload.hasMedia && payload.type === "ptt") {
    await sendText(
      chatId,
      "I received your voice note! Voice message processing is coming soon. For now, could you type your message?"
    );
    return;
  }

  // If no text content, acknowledge
  if (!messageText?.trim()) {
    if (payload.hasMedia) {
      await sendText(
        chatId,
        "I can see you sent a file! I can't process media on WhatsApp yet, but I'm working on it. Try sending a text message instead."
      );
    }
    return;
  }

  // Step 1: Identify user
  const user = await findUserByPhone(phone);

  if (!user) {
    await handleUnknownUser(phone, messageText);
    return;
  }

  // Step 2: Classify intent
  const intent = classifyIntent(messageText);

  if (intent === "simple") {
    // Process directly
    const result = await processMessage(
      user,
      phone,
      messageText,
      wahaMessageId,
      false // no Composio tools
    );

    // Send responses
    for (const msg of result.messages) {
      await sendText(chatId, msg);
    }
  } else {
    // Queue via Inngest for complex processing
    await sendText(chatId, "Let me look that up for you...");

    await inngest.send({
      name: "whatsapp/process-complex-message",
      data: {
        userId: user.id,
        phone,
        messageText,
        wahaMessageId,
        userName: user.name,
        userEmail: user.email,
        teamId: user.teamId,
        timezone: user.timezone,
        whatsappDigestEnabled: user.whatsappDigestEnabled,
        whatsappMeetingSummaryEnabled: user.whatsappMeetingSummaryEnabled,
      },
    });
  }
}

/**
 * Handle messages from unknown (unlinked) phone numbers.
 * Manages the email-based linking flow.
 */
async function handleUnknownUser(phone: string, messageText: string) {
  const chatId = toChatId(phone);

  const email = extractEmail(messageText);

  if (email) {
    // User sent an email — attempt to link
    const result = await linkPhoneByEmail(phone, email);

    if (result.status === "email_linked") {
      const greeting = result.userName
        ? `Linked! Welcome, *${result.userName}*! How can I help you today?`
        : "Linked! Welcome! How can I help you today?";
      await sendText(chatId, greeting);
    } else if (result.status === "not_found" || result.status === "awaiting_email") {
      await sendText(chatId, result.message);
    } else {
      // "linked" status — already linked
      const greeting = result.userName
        ? `Welcome back, *${result.userName}*! How can I help you today?`
        : "Welcome back! How can I help you today?";
      await sendText(chatId, greeting);
    }
  } else {
    // First contact or non-email message — ask for email
    await sendText(
      chatId,
      "Hey there! I'm *AYA*, your AI assistant from Unified Box.\n\nI don't recognize this number yet. Could you share the *email address* you used to sign up on AYA? I'll link your WhatsApp to your account."
    );
  }
}
