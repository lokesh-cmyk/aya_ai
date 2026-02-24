/* eslint-disable @typescript-eslint/no-explicit-any */
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";

/**
 * Build vendor tracker AI tools for the WhatsApp agent.
 * Every query is scoped to teamId for strict org isolation.
 */
export function getVendorTrackerTools(userId: string, teamId: string) {
  return {
    // ──────────────────────────── READ TOOLS ────────────────────────────

    list_vendors: tool({
      description:
        "List vendors for the user's team. Use when user asks 'show my vendors', 'list vendors', 'what vendors do we have', etc.",
      inputSchema: z.object({
        status: z
          .enum(["ONBOARDING", "ACTIVE", "INACTIVE", "OFFBOARDING"])
          .optional()
          .describe("Filter by vendor status"),
        category: z.string().optional().describe("Filter by category (e.g. SaaS, Consulting)"),
        limit: z.number().optional().describe("Max vendors to return. Default 10."),
      }),
      execute: async ({ status, category, limit }) => {
        const take = Math.min(limit || 10, 25);
        const where: any = { teamId };
        if (status) where.status = status;
        if (category) where.category = { contains: category, mode: "insensitive" };

        const vendors = await prisma.vendor.findMany({
          where,
          orderBy: { name: "asc" },
          take,
          include: {
            slas: { select: { status: true } },
            _count: { select: { changeRequests: true, risks: true } },
          },
        });

        return {
          vendors: vendors.map((v, i) => ({
            number: i + 1,
            id: v.id,
            name: v.name,
            status: v.status,
            category: v.category || "N/A",
            renewalDate: v.renewalDate
              ? new Date(v.renewalDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Not set",
            slaHealth: {
              total: v.slas.length,
              breached: v.slas.filter((s) => s.status === "BREACHED").length,
              atRisk: v.slas.filter((s) => s.status === "AT_RISK").length,
            },
            changeRequests: v._count.changeRequests,
            risks: v._count.risks,
          })),
          total: vendors.length,
        };
      },
    }),

    get_vendor_details: tool({
      description:
        "Get detailed information about a specific vendor including contacts, SLAs, and contract details. Use when user asks about a specific vendor.",
      inputSchema: z.object({
        vendorName: z
          .string()
          .optional()
          .describe("Vendor name to search for (partial match)"),
        vendorId: z.string().optional().describe("Exact vendor ID if known"),
      }),
      execute: async ({ vendorName, vendorId }) => {
        let vendor: any = null;

        if (vendorId) {
          vendor = await prisma.vendor.findFirst({
            where: { id: vendorId, teamId },
            include: {
              contacts: true,
              slas: true,
              changeRequests: {
                take: 5,
                orderBy: { createdAt: "desc" },
                select: { id: true, title: true, status: true, priority: true },
              },
              risks: {
                take: 5,
                orderBy: { riskScore: "desc" },
                select: { id: true, title: true, riskScore: true, status: true, category: true },
              },
            },
          });
        } else if (vendorName) {
          vendor = await prisma.vendor.findFirst({
            where: { teamId, name: { contains: vendorName, mode: "insensitive" } },
            include: {
              contacts: true,
              slas: true,
              changeRequests: {
                take: 5,
                orderBy: { createdAt: "desc" },
                select: { id: true, title: true, status: true, priority: true },
              },
              risks: {
                take: 5,
                orderBy: { riskScore: "desc" },
                select: { id: true, title: true, riskScore: true, status: true, category: true },
              },
            },
          });
        }

        if (!vendor) return { error: "Vendor not found. Try listing vendors first." };

        return {
          id: vendor.id,
          name: vendor.name,
          status: vendor.status,
          category: vendor.category,
          website: vendor.website,
          description: vendor.description,
          contract: {
            start: vendor.contractStart?.toISOString().split("T")[0] || null,
            end: vendor.contractEnd?.toISOString().split("T")[0] || null,
            renewalDate: vendor.renewalDate?.toISOString().split("T")[0] || null,
            renewalType: vendor.renewalType,
            billingCycle: vendor.billingCycle,
            value: vendor.contractValue,
          },
          contacts: vendor.contacts.map((c: any) => ({
            name: c.name,
            email: c.email,
            phone: c.phone,
            role: c.role,
            isPrimary: c.isPrimary,
          })),
          slas: vendor.slas.map((s: any) => ({
            name: s.name,
            metric: s.metric,
            target: s.target,
            status: s.status,
          })),
          changeRequests: vendor.changeRequests,
          risks: vendor.risks,
        };
      },
    }),

    get_vendor_stats: tool({
      description:
        "Get vendor dashboard summary stats. Use when user asks 'how are my vendors doing', 'vendor summary', 'vendor stats', etc.",
      inputSchema: z.object({}),
      execute: async () => {
        const [totalVendors, activeVendors, slaBreaches, openCRs, highRisks, upcomingRenewals] =
          await Promise.all([
            prisma.vendor.count({ where: { teamId } }),
            prisma.vendor.count({ where: { teamId, status: "ACTIVE" } }),
            prisma.sLA.count({ where: { vendor: { teamId }, status: "BREACHED" } }),
            prisma.changeRequest.count({
              where: {
                vendor: { teamId },
                status: { in: ["DRAFT", "SUBMITTED", "UNDER_REVIEW"] },
              },
            }),
            prisma.risk.count({
              where: { vendor: { teamId }, riskScore: { gte: 16 }, status: "OPEN" },
            }),
            prisma.vendor.findMany({
              where: {
                teamId,
                renewalDate: {
                  gte: new Date(),
                  lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
              },
              select: { name: true, renewalDate: true },
              orderBy: { renewalDate: "asc" },
              take: 5,
            }),
          ]);

        return {
          totalVendors,
          activeVendors,
          slaBreaches,
          openChangeRequests: openCRs,
          highRisks,
          upcomingRenewals: upcomingRenewals.map((v) => ({
            name: v.name,
            renewalDate: v.renewalDate?.toISOString().split("T")[0],
          })),
        };
      },
    }),

    list_change_requests: tool({
      description:
        "List change requests. Use when user asks about change requests, CRs, pending approvals, etc.",
      inputSchema: z.object({
        vendorName: z.string().optional().describe("Filter by vendor name (partial match)"),
        status: z
          .enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "IMPLEMENTED"])
          .optional()
          .describe("Filter by status"),
        priority: z
          .enum(["LOW", "NORMAL", "HIGH", "CRITICAL"])
          .optional()
          .describe("Filter by priority"),
        limit: z.number().optional().describe("Max to return. Default 10."),
      }),
      execute: async ({ vendorName, status, priority, limit }) => {
        const take = Math.min(limit || 10, 25);
        const where: any = { vendor: { teamId } };
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (vendorName) {
          where.vendor.name = { contains: vendorName, mode: "insensitive" };
        }

        const crs = await prisma.changeRequest.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take,
          include: {
            vendor: { select: { name: true } },
            createdBy: { select: { name: true } },
          },
        });

        return {
          changeRequests: crs.map((cr, i) => ({
            number: i + 1,
            id: cr.id,
            title: cr.title,
            vendor: cr.vendor.name,
            status: cr.status,
            priority: cr.priority,
            requestedBy: cr.requestedBy,
            createdBy: cr.createdBy?.name || "Unknown",
            createdAt: cr.createdAt.toISOString().split("T")[0],
          })),
          total: crs.length,
        };
      },
    }),

    get_change_request_detail: tool({
      description:
        "Get full details of a specific change request including AI impact analysis.",
      inputSchema: z.object({
        changeRequestId: z.string().describe("The change request ID"),
      }),
      execute: async ({ changeRequestId }) => {
        const cr = await prisma.changeRequest.findFirst({
          where: { id: changeRequestId, vendor: { teamId } },
          include: {
            vendor: { select: { name: true } },
            createdBy: { select: { name: true } },
            approvedBy: { select: { name: true } },
          },
        });

        if (!cr) return { error: "Change request not found." };

        const impact = cr.impactAnalysis as any;

        return {
          id: cr.id,
          title: cr.title,
          description: cr.description,
          vendor: cr.vendor.name,
          status: cr.status,
          priority: cr.priority,
          requestedBy: cr.requestedBy,
          createdBy: cr.createdBy?.name,
          approvedBy: cr.approvedBy?.name,
          approvedAt: cr.approvedAt?.toISOString().split("T")[0],
          requestedChange: cr.requestedChange,
          impactAnalysis: impact
            ? {
                cost: impact.cost,
                timeline: impact.timeline,
                scope: impact.scope,
                riskAssessment: impact.riskAssessment,
              }
            : "Analysis pending — AI is still processing this.",
          createdAt: cr.createdAt.toISOString().split("T")[0],
        };
      },
    }),

    list_risks: tool({
      description:
        "List risks. Use when user asks about risks, risk heatmap, high risks, etc.",
      inputSchema: z.object({
        vendorName: z.string().optional().describe("Filter by vendor name (partial match)"),
        category: z
          .enum(["SLA_BREACH", "CONTRACT", "DELIVERY", "FINANCIAL", "OPERATIONAL", "SECURITY"])
          .optional()
          .describe("Filter by risk category"),
        status: z
          .enum(["OPEN", "MITIGATING", "RESOLVED", "ACCEPTED"])
          .optional()
          .describe("Filter by status"),
        minScore: z.number().optional().describe("Minimum risk score (e.g. 16 for high risks)"),
        limit: z.number().optional().describe("Max to return. Default 10."),
      }),
      execute: async ({ vendorName, category, status, minScore, limit }) => {
        const take = Math.min(limit || 10, 25);
        const where: any = { vendor: { teamId } };
        if (category) where.category = category;
        if (status) where.status = status;
        if (minScore) where.riskScore = { gte: minScore };
        if (vendorName) {
          where.vendor.name = { contains: vendorName, mode: "insensitive" };
        }

        const risks = await prisma.risk.findMany({
          where,
          orderBy: { riskScore: "desc" },
          take,
          include: {
            vendor: { select: { name: true } },
          },
        });

        return {
          risks: risks.map((r, i) => ({
            number: i + 1,
            id: r.id,
            title: r.title,
            vendor: r.vendor?.name || "Team-level",
            riskScore: r.riskScore,
            probability: r.probability,
            impact: r.impact,
            category: r.category,
            status: r.status,
            severity:
              r.riskScore >= 20
                ? "CRITICAL"
                : r.riskScore >= 16
                  ? "HIGH"
                  : r.riskScore >= 8
                    ? "MEDIUM"
                    : "LOW",
          })),
          total: risks.length,
        };
      },
    }),

    list_playbooks: tool({
      description:
        "List active playbooks for the team. Use when user asks about playbooks, mitigation strategies, etc.",
      inputSchema: z.object({
        category: z
          .enum(["SLA_BREACH", "CONTRACT", "DELIVERY", "FINANCIAL", "OPERATIONAL", "SECURITY"])
          .optional()
          .describe("Filter by category"),
      }),
      execute: async ({ category }) => {
        const where: any = { teamId, isActive: true };
        if (category) where.category = category;

        const playbooks = await prisma.playbook.findMany({
          where,
          orderBy: [{ isSystemProvided: "desc" }, { name: "asc" }],
        });

        return {
          playbooks: playbooks.map((p, i) => {
            const steps = Array.isArray(p.steps) ? p.steps : [];
            return {
              number: i + 1,
              id: p.id,
              name: p.name,
              description: p.description,
              category: p.category,
              triggerCondition: p.triggerCondition,
              steps: (steps as any[]).length,
              type: p.isSystemProvided ? "System" : "Custom",
            };
          }),
          total: playbooks.length,
        };
      },
    }),

    // ──────────────────────────── WRITE TOOLS ────────────────────────────

    create_vendor: tool({
      description:
        "Create a new vendor for the team. Use when user says 'add vendor', 'create a vendor', 'onboard vendor', etc. Always confirm details before creating.",
      inputSchema: z.object({
        name: z.string().describe("Vendor name (required)"),
        category: z.string().optional().describe("Category (e.g. SaaS, Consulting, Infrastructure)"),
        website: z.string().optional().describe("Vendor website URL"),
        description: z.string().optional().describe("Brief description of the vendor"),
      }),
      execute: async ({ name, category, website, description }) => {
        const vendor = await prisma.vendor.create({
          data: {
            name,
            category: category || null,
            website: website || null,
            description: description || null,
            status: "ONBOARDING",
            teamId,
            createdById: userId,
          },
        });

        return {
          success: true,
          id: vendor.id,
          name: vendor.name,
          status: vendor.status,
          message: `Vendor "${vendor.name}" created with status ONBOARDING.`,
        };
      },
    }),

    create_change_request: tool({
      description:
        "Create a change request for a vendor. AI will automatically analyze the impact. Always confirm details before creating.",
      inputSchema: z.object({
        vendorName: z.string().describe("Vendor name to create the CR for"),
        title: z.string().describe("Short title describing the change request"),
        description: z.string().optional().describe("Detailed description of the requested change"),
        priority: z
          .enum(["LOW", "NORMAL", "HIGH", "CRITICAL"])
          .optional()
          .describe("Priority level. Default: NORMAL"),
      }),
      execute: async ({ vendorName, title, description, priority }) => {
        // Find vendor by name
        const vendor = await prisma.vendor.findFirst({
          where: { teamId, name: { contains: vendorName, mode: "insensitive" } },
          include: { slas: true },
        });

        if (!vendor) {
          return { error: `Vendor "${vendorName}" not found. Try listing vendors first.` };
        }

        // Build originalPlan snapshot
        const originalPlan = {
          vendorName: vendor.name,
          category: vendor.category,
          status: vendor.status,
          contractStart: vendor.contractStart,
          contractEnd: vendor.contractEnd,
          renewalDate: vendor.renewalDate,
          renewalType: vendor.renewalType,
          billingCycle: vendor.billingCycle,
          contractValue: vendor.contractValue,
          slas: vendor.slas.map((s) => ({
            name: s.name,
            metric: s.metric,
            target: s.target,
            status: s.status,
          })),
          snapshotAt: new Date().toISOString(),
        };

        const cr = await prisma.changeRequest.create({
          data: {
            title,
            description: description || null,
            priority: priority || "NORMAL",
            status: "DRAFT",
            originalPlan,
            vendorId: vendor.id,
            createdById: userId,
          },
        });

        // Trigger AI impact analysis
        await inngest.send({
          name: "vendor/change-request.analyze",
          data: {
            changeRequestId: cr.id,
            vendorId: vendor.id,
            userId,
          },
        });

        return {
          success: true,
          id: cr.id,
          title: cr.title,
          vendor: vendor.name,
          status: cr.status,
          message: `Change request created for "${vendor.name}". AI is analyzing the impact — you'll be notified when done.`,
        };
      },
    }),

    create_risk: tool({
      description:
        "Create a risk entry. AI will automatically generate mitigation suggestions. Always confirm details before creating.",
      inputSchema: z.object({
        title: z.string().describe("Risk title"),
        description: z.string().optional().describe("Risk description"),
        probability: z.number().min(1).max(5).describe("Probability (1-5)"),
        impact: z.number().min(1).max(5).describe("Impact (1-5)"),
        category: z
          .enum(["SLA_BREACH", "CONTRACT", "DELIVERY", "FINANCIAL", "OPERATIONAL", "SECURITY"])
          .describe("Risk category"),
        vendorName: z.string().optional().describe("Vendor name to associate with (optional)"),
      }),
      execute: async ({ title, description, probability, impact, category, vendorName }) => {
        let vendorId: string | null = null;

        if (vendorName) {
          const vendor = await prisma.vendor.findFirst({
            where: { teamId, name: { contains: vendorName, mode: "insensitive" } },
          });
          if (!vendor) {
            return { error: `Vendor "${vendorName}" not found. Try listing vendors first.` };
          }
          vendorId = vendor.id;
        }

        const riskScore = probability * impact;

        const risk = await prisma.risk.create({
          data: {
            title,
            description: description || null,
            probability,
            impact,
            riskScore,
            category,
            status: "OPEN",
            vendorId,
            createdById: userId,
          },
        });

        // Trigger AI mitigation suggestions
        await inngest.send({
          name: "vendor/risk.generate-mitigations",
          data: { riskId: risk.id, userId },
        });

        const severity =
          riskScore >= 20
            ? "CRITICAL"
            : riskScore >= 16
              ? "HIGH"
              : riskScore >= 8
                ? "MEDIUM"
                : "LOW";

        return {
          success: true,
          id: risk.id,
          title: risk.title,
          riskScore,
          severity,
          message: `Risk created (Score: ${riskScore}, Severity: ${severity}). AI is generating mitigation suggestions.`,
        };
      },
    }),

    update_vendor_status: tool({
      description:
        "Update a vendor's status. Always confirm with the user before changing status.",
      inputSchema: z.object({
        vendorName: z.string().describe("Vendor name to update"),
        status: z
          .enum(["ONBOARDING", "ACTIVE", "INACTIVE", "OFFBOARDING"])
          .describe("New status"),
      }),
      execute: async ({ vendorName, status }) => {
        const vendor = await prisma.vendor.findFirst({
          where: { teamId, name: { contains: vendorName, mode: "insensitive" } },
        });

        if (!vendor) {
          return { error: `Vendor "${vendorName}" not found.` };
        }

        const updated = await prisma.vendor.update({
          where: { id: vendor.id },
          data: { status },
        });

        return {
          success: true,
          name: updated.name,
          oldStatus: vendor.status,
          newStatus: status,
          message: `Vendor "${updated.name}" status changed from ${vendor.status} to ${status}.`,
        };
      },
    }),

    update_change_request_status: tool({
      description:
        "Update a change request's status. Always confirm with the user before changing.",
      inputSchema: z.object({
        changeRequestId: z.string().describe("Change request ID"),
        status: z
          .enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "IMPLEMENTED"])
          .describe("New status"),
        reason: z.string().optional().describe("Reason for status change (e.g. rejection reason)"),
      }),
      execute: async ({ changeRequestId, status, reason }) => {
        const cr = await prisma.changeRequest.findFirst({
          where: { id: changeRequestId, vendor: { teamId } },
          include: { vendor: { select: { name: true } } },
        });

        if (!cr) return { error: "Change request not found." };

        const data: any = { status };
        if (status === "APPROVED" || status === "REJECTED") {
          data.approvedById = userId;
          data.approvedAt = new Date();
        }
        if (reason) {
          data.rejectionReason = reason;
        }

        await prisma.changeRequest.update({
          where: { id: changeRequestId },
          data,
        });

        return {
          success: true,
          title: cr.title,
          vendor: cr.vendor.name,
          oldStatus: cr.status,
          newStatus: status,
          message: `Change request "${cr.title}" status changed from ${cr.status} to ${status}.`,
        };
      },
    }),

    update_risk_status: tool({
      description:
        "Update a risk's status. Always confirm with the user before changing.",
      inputSchema: z.object({
        riskId: z.string().describe("Risk ID"),
        status: z
          .enum(["OPEN", "MITIGATING", "RESOLVED", "ACCEPTED"])
          .describe("New status"),
      }),
      execute: async ({ riskId, status }) => {
        const risk = await prisma.risk.findFirst({
          where: { id: riskId, vendor: { teamId } },
        });

        if (!risk) return { error: "Risk not found." };

        await prisma.risk.update({
          where: { id: riskId },
          data: { status },
        });

        return {
          success: true,
          title: risk.title,
          oldStatus: risk.status,
          newStatus: status,
          message: `Risk "${risk.title}" status changed from ${risk.status} to ${status}.`,
        };
      },
    }),
  };
}
