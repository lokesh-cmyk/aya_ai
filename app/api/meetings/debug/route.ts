import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Debug endpoint to check meeting processing configuration
 * Returns the status of required environment variables and services
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check environment variables (only check presence, not values for security)
    const config = {
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        description: "Required for Whisper transcription AND GPT-4 insights generation",
      },
      meetingbaas: {
        configured: !!process.env.MEETINGBAAS_API_KEY,
        description: "Required for meeting bot deployment",
      },
      meetingbaasWebhook: {
        configured: !!process.env.MEETINGBAAS_WEBHOOK_SECRET,
        description: "Required for webhook signature verification",
      },
      inngestEventKey: {
        configured: !!process.env.INNGEST_EVENT_KEY,
        description: "Required for Inngest in production (optional in dev)",
      },
      inngestSigningKey: {
        configured: !!process.env.INNGEST_SIGNING_KEY,
        description: "Required for Inngest in production (optional in dev)",
      },
      appUrl: {
        configured: !!process.env.NEXT_PUBLIC_APP_URL,
        value: process.env.NEXT_PUBLIC_APP_URL || "not set",
        description: "Used for webhook URLs - must be publicly accessible for webhooks to work",
      },
    };

    // Calculate webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/meetingbaas`;

    // Check if required services are configured
    const transcriptionAndInsightsReady = config.openai.configured;
    const meetingBotReady = config.meetingbaas.configured;

    const allReady = transcriptionAndInsightsReady && meetingBotReady;

    return NextResponse.json({
      status: allReady ? "ready" : "incomplete",
      message: allReady
        ? "All required services are configured"
        : "Some required services are not configured",
      config,
      webhookUrl,
      recommendations: [
        !config.openai.configured && "Set OPENAI_API_KEY for Whisper transcription and GPT-4 insights",
        !config.meetingbaas.configured && "Set MEETINGBAAS_API_KEY for meeting bot",
        config.appUrl.value === "http://localhost:3000" &&
          "NEXT_PUBLIC_APP_URL is set to localhost - MeetingBaas webhooks won't work locally. Use ngrok or deploy to a public URL.",
        "For local development, run: npx inngest-cli dev",
      ].filter(Boolean),
      troubleshooting: {
        step1: "Ensure all API keys are set in your .env file",
        step2: "For local dev, run 'npx inngest-cli dev' in a separate terminal",
        step3: "For webhooks to work locally, use ngrok: 'ngrok http 3000'",
        step4: "Update NEXT_PUBLIC_APP_URL to your ngrok URL",
        step5: "Configure the ngrok URL as webhook URL in MeetingBaas dashboard",
        step6: "Use the 'Refresh Status' button to manually poll for meeting completion",
        step7: "Use 'Reprocess Transcript' from menu if meeting is stuck in PROCESSING",
      },
    });
  } catch (error) {
    console.error("[debug] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Debug check failed" },
      { status: 500 }
    );
  }
}
