/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";

/**
 * Coordinator function that runs periodically to process emails for all users with Gmail connected
 * Runs every 15 minutes to check for new emails
 */
export const autoEmailManagementCoordinator = inngest.createFunction(
  { 
    id: "auto-email-management-coordinator",
    retries: 3,
  },
  { cron: "*/15 * * * *" }, // Run every 15 minutes
  async ({ step }) => {
    // Get all users with active Gmail integrations
    const usersWithGmail = await step.run("get-users-with-gmail", async () => {
      try {
        // FIX: Query userId and teamId from columns, not from config JSON
        const integrations = await prisma.integration.findMany({
          where: {
            name: "gmail",
            type: "pipedream",
            isActive: true,
          },
          select: {
            id: true,
            userId: true,    // These are columns, not in config!
            teamId: true,    // These are columns, not in config!
          },
        });

        console.log(`[Coordinator] Found ${integrations.length} active Gmail integrations`);

        // Extract unique user IDs and map to team IDs
        const userIds = new Set<string>();
        const userTeamMap = new Map<string, string | null>();

        for (const integration of integrations) {
          const userId = integration.userId;
          const teamId = integration.teamId;

          if (userId) {
            userIds.add(userId);
            // Store the teamId for this user
            userTeamMap.set(userId, teamId);
          }
        }

        console.log(`[Coordinator] Processing ${userIds.size} unique users`);

        return {
          userIds: Array.from(userIds),
          userTeamMap: Object.fromEntries(userTeamMap),
        };
      } catch (error: any) {
        const message =
          error?.message ??
          (typeof error === "object" && error !== null && "type" in error
            ? `Step failed (${(error as { type?: string }).type ?? "unknown"})`
            : String(error));
        const stack = error?.stack;
        console.error("[Coordinator] Error getting users:", message, stack ? `\n${stack}` : "");
        throw error instanceof Error ? error : new Error(message);
      }
    });

    // Trigger email processing for each user
    const events = await step.run("trigger-email-processing", async () => {
      try {
        const eventsToSend = usersWithGmail.userIds.map((userId) => ({
          name: "email/auto-manage" as const,
          data: {
            userId,
            teamId: usersWithGmail.userTeamMap[userId] || null,
          },
        }));

        if (eventsToSend.length > 0) {
          console.log(`[Coordinator] Sending ${eventsToSend.length} events to process emails`);
          await inngest.send(eventsToSend);
        } else {
          console.log("[Coordinator] No events to send - no active Gmail integrations found");
        }

        return {
          usersTriggered: eventsToSend.length,
          userIds: usersWithGmail.userIds,
        };
      } catch (error: any) {
        const message =
          error?.message ??
          (typeof error === "object" && error !== null && "type" in error
            ? `Step failed (${(error as { type?: string }).type ?? "unknown"})`
            : String(error));
        const stack = error?.stack;
        console.error("[Coordinator] Error triggering events:", message, stack ? `\n${stack}` : "");
        throw error instanceof Error ? error : new Error(message);
      }
    });

    return {
      totalUsers: usersWithGmail.userIds.length,
      triggered: events.usersTriggered,
      timestamp: new Date().toISOString(),
    };
  }
);

/**
 * Multi-tenant email management processor
 * Processes emails for a single user with proper isolation
 */
export const autoEmailManagementProcessor = inngest.createFunction(
  {
    id: "auto-email-management-processor",
    // Configure multi-tenancy: limit concurrency per user
    concurrency: [
      {
        key: "event.data.userId",
        limit: 1, // Only 1 concurrent processing per user to avoid conflicts
      },
    ],
    retries: 2,
  },
  { event: "email/auto-manage" },
  async ({ event, step }) => {
    const { userId, teamId } = event.data;

    console.log(`[Processor] Starting email processing for user ${userId}, team ${teamId || 'none'}`);

    // Verify user has Gmail integration
    const integration = await step.run(`verify-gmail-${userId}`, async () => {
      try {
        const integration = await prisma.integration.findFirst({
          where: {
            name: "gmail",
            type: "pipedream",
            isActive: true,
            userId: userId,
          },
        });

        if (!integration) {
          console.log(`[Processor] No Gmail integration found for user ${userId}`);
          return null;
        }

        console.log(`[Processor] Found integration ${integration.id} for user ${userId}`);
        return integration;
      } catch (error: any) {
        console.error(`[Processor] Error verifying integration:`, error);
        throw error;
      }
    });

    if (!integration) {
      return {
        userId,
        skipped: true,
        reason: "Gmail integration not found or inactive",
        timestamp: new Date().toISOString(),
      };
    }

    // Get team ID from integration if not provided
    const finalTeamId = teamId || integration.teamId || null;

    // Process emails using the agent
    // CRITICAL: Call network.run() OUTSIDE of step.run()
    // AgentKit's network.run() creates its own Inngest steps internally
    try {
      console.log(`[Processor] Importing email management agent...`);
      const { processUserEmails } = await import("@/lib/agents/email-management-agent");
      
      console.log(`[Processor] Calling processUserEmails for user ${userId}...`);
      
      // Call network function directly - it manages its own steps internally
      // DO NOT wrap this in step.run() as it will cause nested step conflicts
      const result = await processUserEmails(userId, finalTeamId);

      console.log(`[Processor] Email processing completed for user ${userId}:`, {
        success: result.success,
        actionCount: result.actions,
        messageCount: result.messages?.length || 0,
      });

      // Log the final result (this is safe to put in step.run)
      await step.run(`log-result-${userId}`, async () => {
        console.log(`[Processor] Logged completion for user ${userId}`);
        return { 
          logged: true,
          timestamp: new Date().toISOString(),
        };
      });

      return {
        userId,
        teamId: finalTeamId,
        success: result.success,
        actions: result.actions,
        messagesProcessed: result.messages?.length || 0,
        processedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error(`[Processor] Error processing emails for user ${userId}:`, error);
      
      // Log the error
      await step.run(`log-error-${userId}`, async () => {
        console.error(`[Processor] Email processing failed for user ${userId}:`, {
          error: error.message,
          stack: error.stack,
        });
        return { 
          logged: true,
          error: true,
          timestamp: new Date().toISOString(),
        };
      });

      throw error; // Re-throw to trigger retries
    }
  }
);

/**
 * Manual trigger function for processing emails on-demand
 * Can be called via API or webhook
 */
export const manualEmailProcessing = inngest.createFunction(
  {
    id: "manual-email-processing",
    concurrency: [
      {
        key: "event.data.userId",
        limit: 1, // Only one manual processing at a time per user
      },
    ],
    retries: 2,
  },
  { event: "email/manual-process" },
  async ({ event, step }) => {
    const { userId, teamId } = event.data;

    console.log(`[Manual] Starting manual email processing for user ${userId}`);

    // Verify integration exists
    const integration = await step.run(`verify-integration-${userId}`, async () => {
      const integration = await prisma.integration.findFirst({
        where: {
          name: "gmail",
          type: "pipedream",
          isActive: true,
          userId: userId,
        },
      });

      if (!integration) {
        console.log(`[Manual] No Gmail integration found for user ${userId}`);
      }

      return integration;
    });

    if (!integration) {
      return {
        userId,
        success: false,
        error: "Gmail integration not found or inactive",
        timestamp: new Date().toISOString(),
      };
    }

    // CRITICAL: Call network.run() OUTSIDE of step.run()
    // AgentKit's network.run() creates its own Inngest steps internally
    try {
      const { processUserEmails } = await import("@/lib/agents/email-management-agent");

      console.log(`[Manual] Processing emails for user ${userId}...`);

      // Call network function directly - it manages its own steps
      const result = await processUserEmails(userId, teamId || integration.teamId || null);

      console.log(`[Manual] Processing completed for user ${userId}:`, {
        success: result.success,
        actions: result.actions,
      });

      return {
        userId,
        success: result.success,
        actions: result.actions,
        messagesProcessed: result.messages?.length || 0,
        processedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error(`[Manual] Error processing emails:`, error);
      
      return {
        userId,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
);