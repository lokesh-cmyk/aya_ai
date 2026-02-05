/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { generateDailyDigestEmail } from "@/lib/agents/daily-digest-agent";
import { sendDailyDigestEmail } from "@/lib/emails/daily-digest";

/**
 * Helper function to check if it's 8 AM in a given timezone
 */
function is8AMInTimezone(timezone: string): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const timeString = formatter.format(now);
    const [hour, minute] = timeString.split(':').map(Number);
    
    // Check if it's 8:00 AM (within a 15-minute window to account for cron timing)
    return hour === 8 && minute >= 0 && minute < 15;
  } catch (error) {
    console.error(`Error checking timezone ${timezone}:`, error);
    return false;
  }
}

/**
 * Inngest function that runs every hour to check for users who should receive daily digest
 * This function runs hourly and checks if it's 8 AM in each user's timezone
 * 
 * This is a coordinator function that identifies teams needing digests and triggers
 * the multi-tenant network function for each team.
 */
export const sendDailyDigest = inngest.createFunction(
  { id: "send-daily-digest" },
  { cron: "0 * * * *" }, // Run every hour at minute 0
  async ({ step }) => {
    // Get all teams with their users
    const teams = await step.run("get-teams-with-users", async () => {
      return await prisma.team.findMany({
        include: {
          users: {
            where: {
              emailVerified: true, // Only send to verified users
            },
            select: {
              id: true,
              email: true,
              name: true,
              timezone: true,
            },
          },
        },
      });
    });

    // Filter teams that need digests (it's 8 AM in at least one user's timezone)
    const teamsNeedingDigest = teams.filter((team) => {
      if (team.users.length === 0) return false;
      return team.users.some((user) => {
        const userTimezone = user.timezone || "UTC";
        return is8AMInTimezone(userTimezone);
      });
    });

    // Send events to trigger multi-tenant network function for each team
    // Each team will be processed independently with proper isolation
    const events = await step.run("trigger-digest-generation", async () => {
      const { inngest } = await import("../client");
      
      const eventsToSend = teamsNeedingDigest.map((team) => ({
        name: "daily-digest/generate",
        data: {
          teamId: team.id,
          teamName: team.name,
        },
      }));

      if (eventsToSend.length > 0) {
        await inngest.send(eventsToSend);
      }

      return {
        teamsTriggered: eventsToSend.length,
        teamIds: teamsNeedingDigest.map((t) => t.id),
      };
    });

    return {
      totalTeams: teams.length,
      teamsNeedingDigest: teamsNeedingDigest.length,
      triggered: events.teamsTriggered,
    };
  }
);

/**
 * Process individual team digest generation with multi-tenancy
 * This function is triggered by the coordinator and handles one team at a time
 */
export const processTeamDigest = inngest.createFunction(
  {
    id: "process-team-digest",
    // Configure multi-tenancy: limit concurrency per team
    // This ensures one team's digest generation doesn't block another team's
    concurrency: [
      {
        key: "event.data.teamId", // Use teamId as the tenant key
        limit: 3, // Maximum 3 concurrent operations per team (safety limit)
      },
    ],
    // Optional: Add rate limiting per team
    // rateLimit: {
    //   limit: 10,
    //   period: "1h",
    //   key: "event.data.teamId",
    // },
  },
  { event: "daily-digest/generate" },
  async ({ event, step }) => {
    const { teamId, teamName } = event.data;

    // Get team with users
    const team = await step.run(`get-team-${teamId}`, async () => {
      return await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          users: {
            where: {
              emailVerified: true,
            },
            select: {
              id: true,
              email: true,
              name: true,
              timezone: true,
            },
          },
        },
      });
    });

    if (!team || team.users.length === 0) {
      return { teamId, skipped: true, reason: "No users" };
    }

    // Generate digest for this team using the network
    // Multi-tenancy ensures this doesn't interfere with other teams
    // IMPORTANT: Call network.run() directly, not inside step.run()
    // AgentKit's network.run() creates its own steps internally
    const { generateDailyDigestEmail } = await import("@/lib/agents/daily-digest-agent");
    
    // Call network function directly - it manages its own steps
    const digest = await generateDailyDigestEmail(teamId, teamName);

    // Send email to all team members (not just those in 8 AM timezone, for consistency)
    const emailResults = await Promise.allSettled(
      team.users.map(async (user) => {
        return await step.run(
          `send-email-${user.id}`,
          async () => {
            try {
              await sendDailyDigestEmail({
                to: user.email,
                teamName: teamName,
                subject: digest.subject,
                html: digest.html,
                text: digest.text,
              });
              return { userId: user.id, success: true };
            } catch (error: any) {
              console.error(`Error sending email to ${user.email}:`, error);
              return { userId: user.id, success: false, error: error.message };
            }
          }
        );
      })
    );

    return {
      teamId,
      teamName,
      usersNotified: team.users.length,
      emailResults: emailResults.map((result, index) => ({
        user: team.users[index].email,
        status: result.status,
        value: result.status === "fulfilled" ? result.value : null,
        reason: result.status === "rejected" ? result.reason : null,
      })),
    };
  }
);
