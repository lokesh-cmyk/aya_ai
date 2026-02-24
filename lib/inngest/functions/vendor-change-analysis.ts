/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import {
  generateImpactAnalysis,
  generateMitigationSuggestions,
} from "@/lib/vendors/ai-analysis";

// ============================================
// Inngest: Analyze Change Request via AI
// ============================================

/**
 * Triggered by: vendor/change-request.analyze
 *
 * Fetches the change request, vendor, and SLA data, then uses Claude to
 * generate a structured impact analysis (cost, timeline, scope, risk).
 * The result is stored on the change request's impactAnalysis field.
 */
export const analyzeChangeRequest = inngest.createFunction(
  { id: "analyze-change-request" },
  { event: "vendor/change-request.analyze" },
  async ({ event, step }) => {
    const { changeRequestId, vendorId, userId } = event.data;

    // Step 1: Fetch change request + vendor + SLA data
    const data = await step.run("fetch-change-request-data", async () => {
      const changeRequest = await prisma.changeRequest.findUnique({
        where: { id: changeRequestId },
        include: {
          vendor: {
            include: {
              slas: true,
            },
          },
        },
      });

      if (!changeRequest) {
        throw new Error(`Change request ${changeRequestId} not found`);
      }

      return {
        changeRequest: {
          id: changeRequest.id,
          title: changeRequest.title,
          description: changeRequest.description,
          requestedChange: changeRequest.requestedChange,
          originalPlan: changeRequest.originalPlan,
        },
        vendor: {
          id: changeRequest.vendor.id,
          name: changeRequest.vendor.name,
          category: changeRequest.vendor.category,
          contractStart: changeRequest.vendor.contractStart?.toISOString() || undefined,
          contractEnd: changeRequest.vendor.contractEnd?.toISOString() || undefined,
          contractValue: changeRequest.vendor.contractValue || undefined,
          billingCycle: changeRequest.vendor.billingCycle,
        },
        slas: changeRequest.vendor.slas.map((sla) => ({
          name: sla.name,
          metric: sla.metric,
          target: sla.target,
          status: sla.status,
        })),
      };
    });

    // Step 2: Call AI to generate impact analysis
    const impactAnalysis = await step.run("generate-impact-analysis", async () => {
      return generateImpactAnalysis({
        vendorName: data.vendor.name,
        vendorCategory: data.vendor.category,
        currentSLAs: data.slas,
        contractDetails: {
          contractStart: data.vendor.contractStart,
          contractEnd: data.vendor.contractEnd,
          contractValue: data.vendor.contractValue,
          billingCycle: data.vendor.billingCycle,
        },
        requestedChange: data.changeRequest.requestedChange,
        originalPlan: data.changeRequest.originalPlan,
      });
    });

    // Step 3: Update change request with impact analysis
    await step.run("update-change-request", async () => {
      await prisma.changeRequest.update({
        where: { id: changeRequestId },
        data: {
          impactAnalysis: impactAnalysis as any,
        },
      });
    });

    // Step 4: Notify the user that analysis is complete
    await step.run("notify-user", async () => {
      try {
        await createNotification({
          userId,
          title: "Impact analysis complete",
          message: `AI impact analysis for "${data.changeRequest.title}" is ready to review.`,
          type: "success",
          link: `/vendor-tracker/changes?cr=${changeRequestId}`,
          metadata: {
            changeRequestId,
            vendorId,
            vendorName: data.vendor.name,
          },
        });
      } catch (error) {
        // Notification failure should not break the function
        console.error("[analyzeChangeRequest] Failed to send notification:", error);
      }
    });

    return {
      success: true,
      changeRequestId,
      impactAnalysis,
    };
  }
);

// ============================================
// Inngest: Generate Risk Mitigation Suggestions via AI
// ============================================

/**
 * Triggered by: vendor/risk.generate-mitigations
 *
 * Fetches the risk, its associated vendor, and active playbooks for the
 * risk's category. Uses Claude to generate tailored mitigation suggestions,
 * then stores them on the risk's aiSuggestions field.
 */
export const generateRiskMitigations = inngest.createFunction(
  { id: "generate-risk-mitigations" },
  { event: "vendor/risk.generate-mitigations" },
  async ({ event, step }) => {
    const { riskId, userId } = event.data;

    // Step 1: Fetch risk + vendor + active playbooks
    const data = await step.run("fetch-risk-data", async () => {
      const risk = await prisma.risk.findUnique({
        where: { id: riskId },
        include: {
          vendor: true,
        },
      });

      if (!risk) {
        throw new Error(`Risk ${riskId} not found`);
      }

      // Fetch active playbooks for this risk category
      const teamId = risk.vendor?.teamId;
      const playbooks = teamId
        ? await prisma.playbook.findMany({
            where: {
              teamId,
              category: risk.category,
              isActive: true,
            },
            select: {
              name: true,
              steps: true,
            },
          })
        : [];

      return {
        risk: {
          id: risk.id,
          title: risk.title,
          description: risk.description,
          category: risk.category,
          probability: risk.probability,
          impact: risk.impact,
          riskScore: risk.riskScore,
        },
        vendor: risk.vendor
          ? {
              name: risk.vendor.name,
              category: risk.vendor.category,
            }
          : null,
        playbooks: playbooks.map((pb) => ({
          name: pb.name,
          steps: pb.steps,
        })),
      };
    });

    // Step 2: Call AI to generate mitigation suggestions
    const mitigationResult = await step.run("generate-mitigations", async () => {
      return generateMitigationSuggestions({
        riskTitle: data.risk.title,
        riskDescription: data.risk.description || undefined,
        riskCategory: data.risk.category,
        probability: data.risk.probability,
        impact: data.risk.impact,
        vendorName: data.vendor?.name,
        activePlaybooks: data.playbooks,
      });
    });

    // Step 3: Update risk with AI suggestions
    await step.run("update-risk-suggestions", async () => {
      await prisma.risk.update({
        where: { id: riskId },
        data: {
          aiSuggestions: mitigationResult as any,
        },
      });
    });

    // Step 4: Notify the user that suggestions are ready
    await step.run("notify-user", async () => {
      try {
        await createNotification({
          userId,
          title: "Mitigation suggestions ready",
          message: `${mitigationResult.suggestions.length} AI-generated mitigation strategies for "${data.risk.title}" are ready.`,
          type: "success",
          link: `/vendor-tracker/risks?risk=${riskId}`,
          metadata: {
            riskId,
            vendorName: data.vendor?.name,
            suggestionCount: mitigationResult.suggestions.length,
          },
        });
      } catch (error) {
        // Notification failure should not break the function
        console.error("[generateRiskMitigations] Failed to send notification:", error);
      }
    });

    return {
      success: true,
      riskId,
      suggestionsCount: mitigationResult.suggestions.length,
    };
  }
);
