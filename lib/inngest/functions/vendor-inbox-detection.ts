/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { detectChangeRequestFromMessage } from "@/lib/vendors/ai-detection";
import { createNotification } from "@/lib/notifications";

/**
 * Inngest function to detect vendor change requests from incoming inbox messages.
 *
 * Triggered by event: vendor/inbox.detect-change
 *
 * Steps:
 * 1. Match sender (email/phone) to a VendorContact
 * 2. Run AI detection on the message content
 * 3. If a change request is detected with high confidence, create a DRAFT ChangeRequest
 * 4. Notify the user about the detected change request
 */
export const detectVendorChangeFromInbox = inngest.createFunction(
  { id: "detect-vendor-change-from-inbox" },
  { event: "vendor/inbox.detect-change" },
  async ({ event, step }) => {
    const { messageId, messageContent, senderEmail, senderPhone, userId } =
      event.data;

    // Step 1: Match sender to a VendorContact by email or phone
    const vendorMatch = await step.run(
      "match-sender-to-vendor-contact",
      async () => {
        // Build OR conditions for email and phone matching
        const orConditions: any[] = [];

        if (senderEmail) {
          orConditions.push({ email: senderEmail.toLowerCase() });
        }
        if (senderPhone) {
          orConditions.push({ phone: senderPhone });
        }

        if (orConditions.length === 0) {
          return { matched: false as const, reason: "No email or phone provided" };
        }

        const vendorContact = await prisma.vendorContact.findFirst({
          where: {
            OR: orConditions,
          },
          include: {
            vendor: {
              include: {
                slas: {
                  select: {
                    name: true,
                    metric: true,
                    target: true,
                    currentValue: true,
                    status: true,
                  },
                },
              },
            },
          },
        });

        if (!vendorContact) {
          return {
            matched: false as const,
            reason: "No matching VendorContact found",
          };
        }

        return {
          matched: true as const,
          contactId: vendorContact.id,
          contactName: vendorContact.name,
          vendorId: vendorContact.vendor.id,
          vendorName: vendorContact.vendor.name,
          vendorCategory: vendorContact.vendor.category,
          teamId: vendorContact.vendor.teamId,
          createdById: vendorContact.vendor.createdById,
          contractValue: vendorContact.vendor.contractValue,
          contractStart: vendorContact.vendor.contractStart?.toISOString(),
          contractEnd: vendorContact.vendor.contractEnd?.toISOString(),
          billingCycle: vendorContact.vendor.billingCycle,
          slas: vendorContact.vendor.slas.map((sla) => ({
            name: sla.name,
            metric: sla.metric,
            target: sla.target,
          })),
        };
      }
    );

    // If no vendor contact match, skip processing
    if (!vendorMatch.matched) {
      return {
        skipped: true,
        reason: vendorMatch.reason,
      };
    }

    // Step 2: Call AI detection on the message content
    const detection = await step.run("detect-change-request", async () => {
      return detectChangeRequestFromMessage({
        messageContent,
        senderName: vendorMatch.contactName,
        vendorName: vendorMatch.vendorName,
        vendorCategory: vendorMatch.vendorCategory,
        currentSLAs: vendorMatch.slas,
      });
    });

    // Step 3: If change request detected with high confidence, create a DRAFT ChangeRequest
    if (detection.isChangeRequest && detection.confidence > 0.7) {
      const changeRequest = await step.run(
        "create-draft-change-request",
        async () => {
          // Build originalPlan from vendor SLA/contract data
          const originalPlan: any = {};

          if (vendorMatch.slas.length > 0) {
            originalPlan.slas = vendorMatch.slas;
          }
          if (vendorMatch.contractValue) {
            originalPlan.contractValue = vendorMatch.contractValue;
          }
          if (vendorMatch.contractStart) {
            originalPlan.contractStart = vendorMatch.contractStart;
          }
          if (vendorMatch.contractEnd) {
            originalPlan.contractEnd = vendorMatch.contractEnd;
          }
          if (vendorMatch.billingCycle) {
            originalPlan.billingCycle = vendorMatch.billingCycle;
          }

          const cr = await prisma.changeRequest.create({
            data: {
              title: detection.extractedTitle || "Change request detected from inbox",
              description: detection.extractedChange?.details || undefined,
              requestedBy: vendorMatch.contactName,
              status: "DRAFT",
              priority: "NORMAL",
              originalPlan:
                Object.keys(originalPlan).length > 0 ? originalPlan : undefined,
              requestedChange: detection.extractedChange
                ? {
                    summary: detection.extractedChange.summary,
                    details: detection.extractedChange.details,
                    detectedFrom: "inbox",
                    confidence: detection.confidence,
                  }
                : undefined,
              sourceMessageId: messageId || undefined,
              vendorId: vendorMatch.vendorId,
              createdById: userId || vendorMatch.createdById,
            },
          });

          return { id: cr.id, title: cr.title };
        }
      );

      // Step 4: Notify the user about the detected change request
      await step.run("notify-change-request-detected", async () => {
        const notifyUserId = userId || vendorMatch.createdById;

        await createNotification({
          userId: notifyUserId,
          title: "AYA detected a change request",
          message: `Possible change request from ${vendorMatch.vendorName}: '${changeRequest.title}'. Review the draft.`,
          type: "info",
          link: `/vendors/change-requests?cr=${changeRequest.id}`,
          metadata: {
            changeRequestId: changeRequest.id,
            vendorId: vendorMatch.vendorId,
            vendorName: vendorMatch.vendorName,
            confidence: detection.confidence,
            messageType: detection.messageType,
          },
        });

        return { notified: true, userId: notifyUserId };
      });

      return {
        success: true,
        changeRequestId: changeRequest.id,
        detection: {
          messageType: detection.messageType,
          confidence: detection.confidence,
          title: changeRequest.title,
        },
      };
    }

    // No high-confidence change request detected — return detection info for diagnostics
    return {
      success: true,
      skipped: true,
      reason: detection.isChangeRequest
        ? `Change request detected but confidence too low (${detection.confidence})`
        : "No change request detected",
      detection: {
        messageType: detection.messageType,
        confidence: detection.confidence,
        isChangeRequest: detection.isChangeRequest,
      },
    };
  }
);
