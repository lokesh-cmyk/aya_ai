/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAgent, createTool, openai } from "@inngest/agent-kit";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * Tool to collect project lifecycle information for a team
 */
async function collectProjectData(teamId: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all tasks for the team
  const tasks = await prisma.task.findMany({
    where: {
      taskList: {
        space: {
          teamId: teamId,
        },
      },
    },
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      status: {
        select: {
          name: true,
          color: true,
        },
      },
      taskList: {
        include: {
          space: {
            select: {
              name: true,
            },
          },
        },
      },
      comments: {
        where: {
          createdAt: {
            gte: yesterday,
          },
        },
        include: {
          author: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  // Separate tasks by status
  const completedYesterday = tasks.filter(
    (task) =>
      task.status?.name?.toLowerCase().includes('closed') ||
      task.status?.name?.toLowerCase().includes('done') ||
      (task.updatedAt >= yesterday && task.updatedAt < today && task.progress === 100)
  );

  const dueToday = tasks.filter(
    (task) =>
      task.dueDate &&
      task.dueDate >= today &&
      task.dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000) &&
      task.progress < 100
  );

  const highPriority = tasks.filter(
    (task) =>
      (task.priority === 'HIGH' || task.priority === 'URGENT') &&
      task.progress < 100
  );

  const inProgress = tasks.filter(
    (task) =>
      task.status?.name?.toLowerCase().includes('ongoing') ||
      task.status?.name?.toLowerCase().includes('in progress') ||
      (task.progress > 0 && task.progress < 100)
  );

  // Get recent comments
  const recentComments = tasks
    .flatMap((task) =>
      task.comments.map((comment) => ({
        taskName: task.name,
        comment: comment.content,
        author: comment.author.name || 'Unknown',
        createdAt: comment.createdAt,
      }))
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  return {
    completedYesterday: completedYesterday.map((task) => ({
      name: task.name,
      assignee: task.assignee?.name || 'Unassigned',
      space: task.taskList.space?.name || 'Unknown',
      completedAt: task.updatedAt,
    })),
    dueToday: dueToday.map((task) => ({
      name: task.name,
      assignee: task.assignee?.name || 'Unassigned',
      priority: task.priority,
      space: task.taskList.space?.name || 'Unknown',
      progress: task.progress,
    })),
    highPriority: highPriority.map((task) => ({
      name: task.name,
      assignee: task.assignee?.name || 'Unassigned',
      priority: task.priority,
      space: task.taskList.space?.name || 'Unknown',
      dueDate: task.dueDate,
      progress: task.progress,
    })),
    inProgress: inProgress.map((task) => ({
      name: task.name,
      assignee: task.assignee?.name || 'Unassigned',
      space: task.taskList.space?.name || 'Unknown',
      progress: task.progress,
    })),
    recentComments,
    summary: {
      totalTasks: tasks.length,
      completedCount: completedYesterday.length,
      dueTodayCount: dueToday.length,
      highPriorityCount: highPriority.length,
      inProgressCount: inProgress.length,
    },
  };
}

/**
 * Tool definition for collecting project data
 */
const collectProjectDataTool = createTool({
  name: "collect_project_data",
  description: "Collects all project lifecycle information including tasks, statuses, priorities, and recent activity for a team",
  parameters: z.object({
    teamId: z.string().describe("The team ID to collect data for"),
  }),
  handler: async ({ teamId }: { teamId: string }) => {
    try {
      const data = await collectProjectData(teamId);
      return JSON.stringify(data, null, 2);
    } catch (error: any) {
      return `Error collecting project data: ${error.message}`;
    }
  },
});

/**
 * AgentKit agent that structures project data into a daily digest email
 */
const dailyDigestAgent = createAgent({
  name: "Daily Digest Agent",
  system: `You are a professional project management assistant that creates daily digest emails for teams.

Your task is to:
1. Collect project lifecycle information including:
   - Tasks completed yesterday
   - Tasks due today
   - High priority tasks that need attention
   - Tasks currently in progress
   - Recent comments and updates

2. Create a structured, professional email that:
   - Has a clear subject line
   - Starts with a friendly greeting
   - Summarizes what was accomplished yesterday
   - Highlights what needs attention today
   - Lists high priority items
   - Shows ongoing work
   - Maintains consistency with previous day's format
   - Uses a professional but friendly tone
   - Is concise but informative

3. Format the email in HTML with:
   - Clear sections with headers
   - Bullet points for lists
   - Priority indicators
   - Progress indicators where relevant
   - Professional styling

The email should help team members quickly understand:
- What was accomplished
- What needs their attention today
- What's in progress
- Any important updates or comments`,
  model: openai({ model: "gpt-4o" }),
  tools: [collectProjectDataTool],
});

/**
 * AgentKit network for daily digest generation
 * This network is configured with multi-tenancy support
 * Using a simple router function to avoid default router issues with single agent
 */
import { createNetwork } from "@inngest/agent-kit";

export const dailyDigestNetwork = createNetwork({
  name: "Daily Digest Network",
  defaultModel: openai({ model: "gpt-4o" }),
  agents: [dailyDigestAgent],
  // Provide a simple router that always returns the single agent
  // This avoids the default router's select_agent tool schema issues
  router: ({ callCount }: { callCount: number; input?: string; network?: any; stack?: any[]; lastResult?: any }) => {
    // For single agent, always return the agent on first call, then stop
    if (callCount === 0) {
      return dailyDigestAgent;
    }
    return undefined; // Stop after first agent call
  },
});

/**
 * Generate daily digest email content using the network
 * This function is called by the Inngest function with multi-tenancy support
 */
export async function generateDailyDigestEmail(teamId: string, teamName: string) {
  const prompt = `Generate a daily digest email for the team "${teamName}" (Team ID: ${teamId}).

First, use the collect_project_data tool to gather all the information, then create a well-structured email.

IMPORTANT: Format your response as follows:
Subject: [Your email subject line here]

[Your HTML email content here]

The email should:
- Be professional and friendly
- Start with "Good morning, ${teamName} team!"
- Include a summary section with key metrics
- List completed tasks from yesterday (if any)
- Highlight tasks due today
- Show high priority items that need attention
- Display ongoing work and progress
- Include recent comments or updates
- End with an encouraging note

Format the HTML with:
- Clear section headers (h2, h3)
- Bullet points for lists
- Priority badges/indicators
- Progress bars or percentages where relevant
- Professional styling with inline CSS

Make sure the email is informative but concise, helping team members quickly understand their day ahead.`;

  const result = await dailyDigestNetwork.run(prompt);
  
  // Extract messages from network run result
  const messages = (result as any).messages || [];
  const lastMessage = messages[messages.length - 1]?.content || '';
  
  // Extract subject if present
  const subjectMatch = lastMessage.match(/Subject:\s*(.+?)(?:\n|$)/i);
  const subject = subjectMatch 
    ? subjectMatch[1].trim()
    : `Daily Digest - ${teamName} - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  
  // Extract HTML content (remove subject line if present)
  let html = lastMessage.replace(/Subject:\s*.+?(?:\n|$)/i, '').trim();
  
  // If no HTML tags found, wrap in paragraph tags
  if (!html.includes('<')) {
    html = `<p>${html.replace(/\n/g, '</p><p>')}</p>`;
  }
  
  // Generate plain text version
  const text = html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n').trim();
  
  return {
    subject,
    html,
    text,
  };
}
