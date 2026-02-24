/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

// ============================================
// AI Change Detection from Vendor Inbox Messages
// ============================================

export interface ChangeDetectionParams {
  messageContent: string;
  senderName?: string;
  vendorName: string;
  vendorCategory: string;
  currentSLAs: { name: string; metric: string; target: string }[];
}

export type MessageType =
  | "change_request"
  | "sla_concern"
  | "renewal_discussion"
  | "general";

export interface ChangeDetectionResult {
  isChangeRequest: boolean;
  confidence: number;
  extractedTitle?: string;
  extractedChange?: { summary: string; details: string };
  messageType: MessageType;
}

const DEFAULT_DETECTION_RESULT: ChangeDetectionResult = {
  isChangeRequest: false,
  confidence: 0,
  messageType: "general",
};

/**
 * Detect whether an incoming vendor message contains a change request,
 * SLA concern, renewal discussion, or is a general communication.
 *
 * Uses the Vercel AI SDK with Anthropic's Claude model to analyze the
 * message content in the context of the vendor's category and active SLAs.
 */
export async function detectChangeRequestFromMessage(
  params: ChangeDetectionParams
): Promise<ChangeDetectionResult> {
  try {
    const { messageContent, senderName, vendorName, vendorCategory, currentSLAs } =
      params;

    const slaContext =
      currentSLAs.length > 0
        ? currentSLAs
            .map(
              (sla) =>
                `- ${sla.name}: metric=${sla.metric}, target=${sla.target}`
            )
            .join("\n")
        : "No SLAs currently defined.";

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-5"),
      system:
        "You are analyzing a message from a vendor contact. Determine if this message contains a change request, SLA concern, renewal discussion, or is a general message. Respond in JSON format only, no additional text or markdown formatting.",
      prompt: `Analyze the following message from a vendor contact and classify it.

Vendor: ${vendorName}
Category: ${vendorCategory}
${senderName ? `Sender: ${senderName}` : ""}

Current SLAs:
${slaContext}

Message:
"""
${messageContent}
"""

Classify this message and respond with a JSON object containing exactly these fields:
{
  "isChangeRequest": true/false - whether this message contains or implies a change request (pricing change, scope change, timeline change, service modification, etc.),
  "confidence": 0.0-1.0 - how confident you are in your classification,
  "extractedTitle": "Short title summarizing the change request (only if isChangeRequest is true, otherwise null)",
  "extractedChange": {
    "summary": "One-sentence summary of what is being changed (only if isChangeRequest is true, otherwise null)",
    "details": "Detailed description of the change including specifics from the message (only if isChangeRequest is true, otherwise null)"
  } or null if not a change request,
  "messageType": "change_request" | "sla_concern" | "renewal_discussion" | "general"
}

Classification guidelines:
- "change_request": Message proposes or announces changes to pricing, scope, timeline, deliverables, team assignments, or service terms
- "sla_concern": Message raises issues about service levels, performance metrics, downtime, or quality without proposing a specific change
- "renewal_discussion": Message discusses contract renewal, extension, renegotiation, or upcoming expiration
- "general": Regular communication, status updates, meeting requests, or other non-actionable messages

Be conservative — only mark as change_request if there is a clear proposed or announced change.`,
      maxOutputTokens: 512,
    });

    const parsed = JSON.parse(text.trim());

    // Validate confidence is within bounds
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));

    return {
      isChangeRequest: Boolean(parsed.isChangeRequest),
      confidence,
      extractedTitle: parsed.extractedTitle || undefined,
      extractedChange: parsed.extractedChange
        ? {
            summary: parsed.extractedChange.summary || "",
            details: parsed.extractedChange.details || "",
          }
        : undefined,
      messageType: (["change_request", "sla_concern", "renewal_discussion", "general"].includes(
        parsed.messageType
      )
        ? parsed.messageType
        : "general") as MessageType,
    };
  } catch (error) {
    console.error(
      "[AI Detection] Failed to detect change request from message:",
      error
    );
    return DEFAULT_DETECTION_RESULT;
  }
}
