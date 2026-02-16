/**
 * One-time setup script for WAHA WhatsApp session.
 * Run with: npx tsx scripts/setup-waha.ts
 *
 * This creates (or updates) a WAHA session with webhook configuration
 * pointing to your deployed app.
 */

const WAHA_API_URL = process.env.WAHA_API_URL || "https://allys-ai-waha-gsvqb.ondigitalocean.app";
const WAHA_API_KEY = process.env.WAHA_API_KEY || "";
const WAHA_SESSION_NAME = process.env.WAHA_SESSION_NAME || "default";
const WAHA_WEBHOOK_SECRET = process.env.WAHA_WEBHOOK_SECRET || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function setup() {
  const webhookUrl = `${APP_URL}/api/webhooks/waha`;

  console.log("🔧 Setting up WAHA session...");
  console.log(`   WAHA URL: ${WAHA_API_URL}`);
  console.log(`   Session: ${WAHA_SESSION_NAME}`);
  console.log(`   Webhook: ${webhookUrl}`);

  // Check if session exists
  try {
    const res = await fetch(`${WAHA_API_URL}/api/sessions/${WAHA_SESSION_NAME}`, {
      headers: { "X-Api-Key": WAHA_API_KEY },
    });

    if (res.ok) {
      const session = await res.json();
      console.log(`\n📱 Session "${WAHA_SESSION_NAME}" exists (status: ${session.status})`);

      // Update webhook config
      const updateRes = await fetch(`${WAHA_API_URL}/api/sessions/${WAHA_SESSION_NAME}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": WAHA_API_KEY,
        },
        body: JSON.stringify({
          config: {
            webhooks: [
              {
                url: webhookUrl,
                events: ["message", "session.status"],
                ...(WAHA_WEBHOOK_SECRET
                  ? { hmac: { key: WAHA_WEBHOOK_SECRET } }
                  : {}),
              },
            ],
          },
        }),
      });

      if (updateRes.ok) {
        console.log("✅ Webhook configured successfully!");
      } else {
        console.error("❌ Failed to update webhook:", await updateRes.text());
      }
    } else {
      // Create new session
      console.log(`\n📱 Creating session "${WAHA_SESSION_NAME}"...`);

      const createRes = await fetch(`${WAHA_API_URL}/api/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": WAHA_API_KEY,
        },
        body: JSON.stringify({
          name: WAHA_SESSION_NAME,
          config: {
            webhooks: [
              {
                url: webhookUrl,
                events: ["message", "session.status"],
                ...(WAHA_WEBHOOK_SECRET
                  ? { hmac: { key: WAHA_WEBHOOK_SECRET } }
                  : {}),
              },
            ],
          },
        }),
      });

      if (createRes.ok) {
        console.log("✅ Session created! You'll need to scan the QR code to pair.");
        console.log(`   Open: ${WAHA_API_URL}/api/${WAHA_SESSION_NAME}/auth/qr`);
      } else {
        console.error("❌ Failed to create session:", await createRes.text());
      }
    }
  } catch (error) {
    console.error("❌ Error connecting to WAHA:", error);
  }
}

setup();
