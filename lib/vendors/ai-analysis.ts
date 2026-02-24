/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

// ============================================
// AI Impact Analysis for Vendor Change Requests
// ============================================

export interface ImpactAnalysisParams {
  vendorName: string;
  vendorCategory: string;
  currentSLAs: {
    name: string;
    metric: string;
    target: string;
    status: string;
  }[];
  contractDetails: {
    contractStart?: string;
    contractEnd?: string;
    contractValue?: number;
    billingCycle?: string;
  };
  requestedChange: any;
  originalPlan: any;
}

export interface ImpactAnalysisResult {
  cost: string;
  timeline: string;
  scope: string;
  riskAssessment: string;
}

const DEFAULT_IMPACT_ANALYSIS: ImpactAnalysisResult = {
  cost: "Unable to analyze cost impact at this time.",
  timeline: "Unable to analyze timeline impact at this time.",
  scope: "Unable to analyze scope impact at this time.",
  riskAssessment: "Unable to generate risk assessment at this time.",
};

/**
 * Generate a structured impact analysis for a vendor change request using Claude.
 *
 * Uses the Vercel AI SDK with Anthropic's Claude model to analyze the potential
 * cost, timeline, scope, and risk implications of a requested change against
 * the vendor's current SLAs, contract details, and original plan.
 */
export async function generateImpactAnalysis(
  params: ImpactAnalysisParams
): Promise<ImpactAnalysisResult> {
  try {
    const {
      vendorName,
      vendorCategory,
      currentSLAs,
      contractDetails,
      requestedChange,
      originalPlan,
    } = params;

    const slaContext =
      currentSLAs.length > 0
        ? currentSLAs
            .map(
              (sla) =>
                `- ${sla.name}: metric=${sla.metric}, target=${sla.target}, status=${sla.status}`
            )
            .join("\n")
        : "No SLAs currently defined.";

    const contractContext = [
      contractDetails.contractStart
        ? `Start: ${contractDetails.contractStart}`
        : null,
      contractDetails.contractEnd
        ? `End: ${contractDetails.contractEnd}`
        : null,
      contractDetails.contractValue
        ? `Value: $${contractDetails.contractValue.toLocaleString()}`
        : null,
      contractDetails.billingCycle
        ? `Billing: ${contractDetails.billingCycle}`
        : null,
    ]
      .filter(Boolean)
      .join(", ");

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-5"),
      system:
        "You are a vendor management expert analyzing change requests. Provide a structured impact analysis. Always respond with valid JSON only, no additional text or markdown formatting.",
      prompt: `Analyze the following vendor change request and provide a structured impact analysis.

Vendor: ${vendorName}
Category: ${vendorCategory}
Contract Details: ${contractContext || "No contract details available."}

Current SLAs:
${slaContext}

Original Plan:
${JSON.stringify(originalPlan, null, 2) || "No original plan specified."}

Requested Change:
${JSON.stringify(requestedChange, null, 2) || "No change details specified."}

Provide your analysis as a JSON object with exactly these fields:
{
  "cost": "Analysis of cost implications, including potential budget impact and any price changes",
  "timeline": "Analysis of timeline implications, including delivery delays or schedule changes",
  "scope": "Analysis of scope implications, including what deliverables or services are affected",
  "riskAssessment": "Overall risk assessment covering SLA impact, contractual risks, and recommended actions"
}

Be specific and actionable. Reference the SLA data and contract details in your analysis where relevant.`,
      maxOutputTokens: 1024,
    });

    const parsed = JSON.parse(text.trim());

    return {
      cost: parsed.cost || DEFAULT_IMPACT_ANALYSIS.cost,
      timeline: parsed.timeline || DEFAULT_IMPACT_ANALYSIS.timeline,
      scope: parsed.scope || DEFAULT_IMPACT_ANALYSIS.scope,
      riskAssessment:
        parsed.riskAssessment || DEFAULT_IMPACT_ANALYSIS.riskAssessment,
    };
  } catch (error) {
    console.error("[AI Analysis] Failed to generate impact analysis:", error);
    return DEFAULT_IMPACT_ANALYSIS;
  }
}

// ============================================
// AI Mitigation Suggestions for Vendor Risks
// ============================================

export interface MitigationSuggestionsParams {
  riskTitle: string;
  riskDescription?: string;
  riskCategory: string;
  probability: number;
  impact: number;
  vendorName?: string;
  vendorHistory?: string;
  activePlaybooks: { name: string; steps: any }[];
}

export interface MitigationSuggestion {
  title: string;
  description: string;
  applicability: string;
}

export interface MitigationSuggestionsResult {
  suggestions: MitigationSuggestion[];
}

const DEFAULT_MITIGATION_RESULT: MitigationSuggestionsResult = {
  suggestions: [
    {
      title: "Review and assess risk manually",
      description:
        "AI-generated suggestions are unavailable. Please review this risk manually and consult relevant stakeholders.",
      applicability:
        "Applicable when automated analysis is not available.",
    },
  ],
};

/**
 * Generate mitigation suggestions for a vendor risk using Claude.
 *
 * Uses the Vercel AI SDK with Anthropic's Claude model to suggest 3-5 specific
 * mitigation strategies based on the risk details, vendor context, and any
 * active playbooks already in place.
 */
export async function generateMitigationSuggestions(
  params: MitigationSuggestionsParams
): Promise<MitigationSuggestionsResult> {
  try {
    const {
      riskTitle,
      riskDescription,
      riskCategory,
      probability,
      impact,
      vendorName,
      vendorHistory,
      activePlaybooks,
    } = params;

    const riskScore = probability * impact;
    const severityLabel =
      riskScore >= 20 ? "Critical" : riskScore >= 12 ? "High" : riskScore >= 6 ? "Medium" : "Low";

    const playbookContext =
      activePlaybooks.length > 0
        ? activePlaybooks
            .map(
              (pb) =>
                `- ${pb.name}: ${JSON.stringify(pb.steps)}`
            )
            .join("\n")
        : "No active playbooks for this risk category.";

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-5"),
      system:
        "You are a risk management expert specializing in vendor and supply chain risk. Suggest specific, actionable mitigation strategies. Always respond with valid JSON only, no additional text or markdown formatting.",
      prompt: `Analyze the following vendor risk and suggest mitigation strategies.

Risk Title: ${riskTitle}
Description: ${riskDescription || "No description provided."}
Category: ${riskCategory}
Probability: ${probability}/5
Impact: ${impact}/5
Risk Score: ${riskScore}/25 (${severityLabel})
${vendorName ? `Vendor: ${vendorName}` : ""}
${vendorHistory ? `Vendor History: ${vendorHistory}` : ""}

Active Playbooks for Reference:
${playbookContext}

Provide your response as a JSON object with a "suggestions" array containing 3-5 mitigation strategies. Each suggestion must have:
{
  "suggestions": [
    {
      "title": "Short, actionable title for the mitigation strategy",
      "description": "Detailed description of the strategy, including specific steps to implement it",
      "applicability": "When and under what conditions this strategy is most applicable"
    }
  ]
}

Consider the existing playbooks to avoid duplication. Focus on strategies that are specific to the risk category (${riskCategory}) and severity level (${severityLabel}). Prioritize the most impactful strategies first.`,
      maxOutputTokens: 1536,
    });

    const parsed = JSON.parse(text.trim());

    if (
      !parsed.suggestions ||
      !Array.isArray(parsed.suggestions) ||
      parsed.suggestions.length === 0
    ) {
      return DEFAULT_MITIGATION_RESULT;
    }

    return {
      suggestions: parsed.suggestions.map((s: any) => ({
        title: s.title || "Untitled suggestion",
        description: s.description || "No description provided.",
        applicability: s.applicability || "General applicability.",
      })),
    };
  } catch (error) {
    console.error(
      "[AI Analysis] Failed to generate mitigation suggestions:",
      error
    );
    return DEFAULT_MITIGATION_RESULT;
  }
}
