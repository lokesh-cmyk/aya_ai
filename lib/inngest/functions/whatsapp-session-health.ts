/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";
import { getSessionStatus, restartSession } from "@/lib/integrations/waha";
import { prisma } from "@/lib/prisma";

let consecutiveFailures = 0;

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
      consecutiveFailures = 0;
      return { healthy: true, status: status.status };
    }

    // Session not healthy — attempt restart
    consecutiveFailures++;

    const restartResult = await step.run("restart-session", async () => {
      try {
        await restartSession();
        return { restarted: true };
      } catch (error: any) {
        return { restarted: false, error: error.message };
      }
    });

    // After 3 consecutive failures, notify admin
    if (consecutiveFailures >= 3) {
      await step.run("notify-admin", async () => {
        // Find admin users
        const admins = await prisma.user.findMany({
          where: { role: "ADMIN" },
          select: { id: true },
        });

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              title: "WAHA WhatsApp Session Down",
              message: `WhatsApp session has been unhealthy for ${consecutiveFailures} consecutive checks. Last status: ${status.status}. Auto-restart ${restartResult.restarted ? "succeeded" : "failed"}.`,
              type: "ALERT",
            },
          });
        }
      });
    }

    return {
      healthy: false,
      status: status.status,
      consecutiveFailures,
      restarted: restartResult.restarted,
    };
  }
);
