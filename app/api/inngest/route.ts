import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { syncGmailEmails } from "@/lib/inngest/functions/sync-gmail";
import { syncOutlookEmails } from "@/lib/inngest/functions/sync-outlook";
import { triggerGmailWebhook } from "@/lib/inngest/functions/trigger-webhook";
import { createBidirectionalContact } from "@/lib/inngest/functions/create-contact";
import { processGmailWebhook } from "@/lib/inngest/functions/process-webhook";
import { sendDailyDigest, processTeamDigest } from "@/lib/inngest/functions/daily-digest";
import {
  autoEmailManagementCoordinator,
  autoEmailManagementProcessor,
  manualEmailProcessing,
} from "@/lib/inngest/functions/auto-email-management";
import {
  syncCalendarMeetings,
  syncUserMeetings,
  scheduleMeetingBot,
  processMeetingComplete,
  generateMeetingInsights,
  handleTranscriptionReady,
  pollMeetingStatuses,
} from "@/lib/inngest/functions/meeting-orchestration";
import { processComplexWhatsAppMessage } from "@/lib/inngest/functions/whatsapp-message";
import { wahaSessionHealthCheck } from "@/lib/inngest/functions/whatsapp-session-health";

// Create an API that serves Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    syncGmailEmails,
    syncOutlookEmails,
    triggerGmailWebhook,
    createBidirectionalContact,
    processGmailWebhook,
    sendDailyDigest, // Coordinator function (cron)
    processTeamDigest, // Multi-tenant team processor
    autoEmailManagementCoordinator, // Email management coordinator (cron)
    autoEmailManagementProcessor, // Multi-tenant email processor
    manualEmailProcessing, // Manual email processing trigger
    // Meeting orchestration functions
    syncCalendarMeetings, // Cron: sync calendar for meetings
    syncUserMeetings, // Per-user meeting sync
    scheduleMeetingBot, // Schedule bot to join meeting
    processMeetingComplete, // Process completed meeting
    generateMeetingInsights, // Generate AI insights
    handleTranscriptionReady, // Handle async transcription
    pollMeetingStatuses, // Cron: poll MeetingBaas for stuck meetings (webhook fallback)
    // WhatsApp functions
    processComplexWhatsAppMessage, // Process complex WhatsApp messages via Inngest
    wahaSessionHealthCheck, // Cron: WAHA session health monitoring
  ],
});
