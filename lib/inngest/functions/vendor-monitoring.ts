/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { createTeamNotification } from "@/lib/notifications";

/**
 * Daily cron job that checks for vendor contract renewals approaching within 30 days.
 * Runs every day at 9 AM UTC.
 *
 * Thresholds:
 *   - 7 days or less  -> WARNING notification
 *   - 8-14 days       -> INFO notification
 *   - 15-30 days      -> INFO notification (only if not already notified in last 7 days)
 */
export const vendorRenewalCheck = inngest.createFunction(
  { id: "vendor-renewal-check" },
  { cron: "0 9 * * *" }, // Daily at 9 AM UTC
  async ({ step }) => {
    // Step 1: Find all teams that have vendors with upcoming renewal dates
    const teamsWithVendors = await step.run("find-teams-with-vendors", async () => {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const vendors = await prisma.vendor.findMany({
        where: {
          renewalDate: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
          status: {
            in: ["ACTIVE", "ONBOARDING"],
          },
        },
        include: {
          team: {
            select: { id: true, name: true },
          },
        },
      });

      return vendors.map((v) => ({
        id: v.id,
        name: v.name,
        renewalDate: v.renewalDate!.toISOString(),
        contractValue: v.contractValue,
        teamId: v.team.id,
        teamName: v.team.name,
      }));
    });

    if (teamsWithVendors.length === 0) {
      return { teamsChecked: 0, vendorsExpiring: 0, notificationsSent: 0 };
    }

    // Step 2: Group vendors by team
    const vendorsByTeam = await step.run("group-vendors-by-team", async () => {
      const grouped: Record<string, { teamName: string; vendors: typeof teamsWithVendors }> = {};

      for (const vendor of teamsWithVendors) {
        if (!grouped[vendor.teamId]) {
          grouped[vendor.teamId] = { teamName: vendor.teamName, vendors: [] };
        }
        grouped[vendor.teamId].vendors.push(vendor);
      }

      return grouped;
    });

    // Step 3: For each team, categorize vendors by threshold and send notifications
    let totalNotificationsSent = 0;
    const teamIds = Object.keys(vendorsByTeam);

    for (const teamId of teamIds) {
      const teamData = vendorsByTeam[teamId];

      const notificationCount = await step.run(
        `notify-team-${teamId}`,
        async () => {
          const now = new Date();
          let sentCount = 0;

          for (const vendor of teamData.vendors) {
            const renewalDate = new Date(vendor.renewalDate);
            const daysUntilRenewal = Math.ceil(
              (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            let notificationType: "warning" | "info";
            let thresholdLabel: string;

            if (daysUntilRenewal <= 7) {
              notificationType = "warning";
              thresholdLabel = `${daysUntilRenewal} day${daysUntilRenewal === 1 ? "" : "s"}`;
            } else if (daysUntilRenewal <= 14) {
              notificationType = "info";
              thresholdLabel = `${daysUntilRenewal} days`;
            } else {
              // 15-30 days: only notify if not already notified in last 7 days
              notificationType = "info";
              thresholdLabel = `${daysUntilRenewal} days`;

              // Check for recent notifications about this vendor's renewal
              const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              const existingNotifications = await prisma.notification.findFirst({
                where: {
                  user: { teamId },
                  title: { contains: "Vendor Renewal" },
                  metadata: {
                    path: ["vendorId"],
                    equals: vendor.id,
                  },
                  createdAt: { gte: sevenDaysAgo },
                },
              });

              if (existingNotifications) {
                // Already notified recently, skip
                continue;
              }
            }

            const renewalDateStr = new Date(vendor.renewalDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            const valueStr = vendor.contractValue
              ? ` (contract value: $${vendor.contractValue.toLocaleString()})`
              : "";

            await createTeamNotification(teamId, {
              title: "Vendor Renewal Approaching",
              message: `${vendor.name} renewal in ${thresholdLabel} (${renewalDateStr})${valueStr}`,
              type: notificationType,
              link: `/vendor-tracker?vendor=${vendor.id}`,
              metadata: {
                vendorId: vendor.id,
                vendorName: vendor.name,
                renewalDate: vendor.renewalDate,
                daysUntilRenewal,
                source: "vendor-renewal-check",
              },
            });

            sentCount++;
          }

          return sentCount;
        }
      );

      totalNotificationsSent += notificationCount;
    }

    return {
      teamsChecked: teamIds.length,
      vendorsExpiring: teamsWithVendors.length,
      notificationsSent: totalNotificationsSent,
    };
  }
);

/**
 * Cron job that checks for breached SLAs and auto-creates Risk records.
 * Runs every 6 hours.
 *
 * For each breached SLA:
 *   1. Check if a Risk with category SLA_BREACH already exists for this vendor + SLA
 *   2. If not, create a new Risk record
 *   3. Notify the team about the breach
 */
export const vendorSLACheck = inngest.createFunction(
  { id: "vendor-sla-check" },
  { cron: "0 */6 * * *" }, // Every 6 hours
  async ({ step }) => {
    // Step 1: Find all SLAs with status BREACHED, including vendor and team info
    const breachedSLAs = await step.run("find-breached-slas", async () => {
      const slas = await prisma.sLA.findMany({
        where: {
          status: "BREACHED",
        },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              teamId: true,
              team: {
                select: {
                  id: true,
                  name: true,
                  users: {
                    where: { role: "ADMIN" },
                    select: { id: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      return slas.map((sla) => ({
        id: sla.id,
        name: sla.name,
        description: sla.description,
        metric: sla.metric,
        target: sla.target,
        currentValue: sla.currentValue,
        vendorId: sla.vendor.id,
        vendorName: sla.vendor.name,
        teamId: sla.vendor.teamId,
        teamName: sla.vendor.team.name,
        firstAdminId: sla.vendor.team.users[0]?.id || null,
      }));
    });

    if (breachedSLAs.length === 0) {
      return { slasChecked: 0, newRisksCreated: 0, notificationsSent: 0 };
    }

    // Step 2: For each breached SLA, check for existing Risk and create if needed
    let newRisksCreated = 0;
    let notificationsSent = 0;

    for (const sla of breachedSLAs) {
      const result = await step.run(`process-sla-breach-${sla.id}`, async () => {
        // Check if a Risk with category SLA_BREACH already exists for this vendor + SLA
        const existingRisk = await prisma.risk.findFirst({
          where: {
            vendorId: sla.vendorId,
            category: "SLA_BREACH",
            title: { contains: sla.name },
            status: { in: ["OPEN", "MITIGATING"] },
          },
        });

        if (existingRisk) {
          return { riskCreated: false, notified: false };
        }

        // No admin found — cannot create risk (createdById is required)
        if (!sla.firstAdminId) {
          console.warn(
            `[vendor-sla-check] No admin found for team ${sla.teamId}, skipping risk creation for SLA ${sla.id}`
          );
          return { riskCreated: false, notified: false };
        }

        // Create a new Risk for this SLA breach
        await prisma.risk.create({
          data: {
            title: `SLA Breach: ${sla.name}`,
            description: `Vendor ${sla.vendorName} SLA '${sla.name}' is breached. Current: ${sla.currentValue || "N/A"}, Target: ${sla.target}`,
            probability: 4,
            impact: 3,
            riskScore: 12,
            category: "SLA_BREACH",
            status: "OPEN",
            vendorId: sla.vendorId,
            createdById: sla.firstAdminId,
          },
        });

        // Notify team about the breach
        await createTeamNotification(sla.teamId, {
          title: "SLA Breach Detected",
          message: `${sla.vendorName}: SLA '${sla.name}' is breached. Current value: ${sla.currentValue || "N/A"}, Target: ${sla.target}`,
          type: "warning",
          link: `/vendor-tracker?vendor=${sla.vendorId}`,
          metadata: {
            vendorId: sla.vendorId,
            vendorName: sla.vendorName,
            slaId: sla.id,
            slaName: sla.name,
            source: "vendor-sla-check",
          },
        });

        return { riskCreated: true, notified: true };
      });

      if (result.riskCreated) newRisksCreated++;
      if (result.notified) notificationsSent++;
    }

    return {
      slasChecked: breachedSLAs.length,
      newRisksCreated,
      notificationsSent,
    };
  }
);
