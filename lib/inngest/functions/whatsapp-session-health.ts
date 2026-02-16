/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";
import { getSessionStatus, restartSession } from "@/lib/integrations/waha";
import { prisma } from "@/lib/prisma";

const FAILURE_THRESHOLD = 3;
const HEALTH_KEY = "waha_consecutive_failures";

/**
 * Get the current consecutive failure count from the database.
 * Uses the Webhook model as a simple key-value store.
 */
async function getFailureCount(): Promise<number> {
  const record = await prisma.webhook.findFirst({
    where: { source: HEALTH_KEY },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return 0;
  const payload = record.payload as any;
  return payload?.count ?? 0;
}

/**
 * Set the consecutive failure count in the database.
 */
async function setFailureCount(count: number): Promise<void> {
  // Upsert — delete old records and create new one
  await prisma.webhook.deleteMany({ where: { source: HEALTH_KEY } });
  await prisma.webhook.create({
    data: {
      source: HEALTH_KEY,
      payload: { count },
      processed: true,
    },
  });
}

/**
 * Monitor WAHA session health every 5 minutes.
 * Auto-restart on disconnect, notify admin after 3 consecutive failures.
 */
export const wahaSessionHealthCheck = inngest.createFunction(
  { id: "waha-session-health-check" },
  { cron: "*/5 * * * *" }, // Every 5 minutes
  async ({ step }) => {
    const status = await step.run("check-session", async () => {
      try {
        const session = await getSessionStatus();
        return { ok: true, status: session.status, name: session.name };
      } catch (error: any) {
        return { ok: false, status: "unreachable", error: error.message };
      }
    });

    if (status.ok && status.status === "WORKING") {
      // Reset failure count
      await step.run("reset-counter", async () => {
        await setFailureCount(0);
      });
      return { healthy: true, status: status.status };
    }

    // Session not healthy — increment failure count and attempt restart
    const failureCount = await step.run("increment-counter", async () => {
      const current = await getFailureCount();
      const newCount = current + 1;
      await setFailureCount(newCount);
      return newCount;
    });

    const restartResult = await step.run("restart-session", async () => {
      try {
        await restartSession();
        return { restarted: true };
      } catch (error: any) {
        return { restarted: false, error: error.message };
      }
    });

    // After threshold consecutive failures, notify admin
    if (failureCount >= FAILURE_THRESHOLD) {
      await step.run("notify-admin", async () => {
        const admins = await prisma.user.findMany({
          where: { role: "ADMIN" },
          select: { id: true },
        });

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              title: "WAHA WhatsApp Session Down",
              message: `WhatsApp session has been unhealthy for ${failureCount} consecutive checks. Last status: ${status.status}. Auto-restart ${restartResult.restarted ? "succeeded" : "failed"}.`,
              type: "error",
            },
          });
        }
      });
    }

    return {
      healthy: false,
      status: status.status,
      consecutiveFailures: failureCount,
      restarted: restartResult.restarted,
    };
  }
);
