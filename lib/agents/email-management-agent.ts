/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAgent, createNetwork, createTool, openai } from "@inngest/agent-kit";
import { z } from "zod";
import { GmailClient } from "../gmail/client";

/**
 * Email categories for auto-categorization
 */
export const EMAIL_CATEGORIES = {
  PRIMARY: "Primary",
  SOCIAL: "Social",
  PROMOTIONS: "Promotions",
  UPDATES: "Updates",
  FORUMS: "Forums",
  IMPORTANT: "Important",
  WORK: "Work",
  PERSONAL: "Personal",
  SPAM: "Spam",
} as const;

/**
 * Tool: Fetch recent emails from Gmail
 */
const fetchEmailsTool = createTool({
  name: "fetch_emails",
  description: "Fetches recent emails from Gmail inbox. Returns a list of emails with their metadata.",
  parameters: z.object({
    userId: z.string().describe("The user ID to fetch emails for"),
    teamId: z.string().nullable().default(null).describe("Optional team ID"),
    maxResults: z.number().default(50).describe("Maximum number of emails to fetch (default: 50)"),
    query: z.string().default("in:inbox").describe("Optional Gmail search query (e.g., 'is:unread', 'from:example.com')"),
  }),
  handler: async ({ userId, teamId, maxResults, query }: {
    userId: string;
    teamId?: string | null;
    maxResults?: number;
    query?: string;
  }) => {
    try {
      console.log(`[fetch_emails] Fetching emails for user ${userId}, query: ${query}, maxResults: ${maxResults}`);
      
      // Use the direct Gmail API client
      const client = new GmailClient(userId, teamId || null);
      await client.connect();
      
      // Search for messages
      const messages = await client.searchEmails(query || "in:inbox", maxResults || 50);

      console.log(`[fetch_emails] Found ${messages.length} messages`);

      // Get full details for each message
      const emailDetails = await Promise.all(
        messages.slice(0, Math.min(10, messages.length)).map(async (msg: any) => {
          try {
            const email = await client.getEmail(msg.id);
            
            // Extract headers
            const headers = email.payload?.headers || [];
            const getHeader = (name: string) => 
              headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

            return {
              id: email.id,
              threadId: email.threadId,
              subject: getHeader("Subject"),
              from: getHeader("From"),
              to: getHeader("To"),
              date: getHeader("Date"),
              snippet: email.snippet || "",
              labelIds: email.labelIds || [],
            };
          } catch (error: any) {
            console.error(`[fetch_emails] Error fetching email ${msg.id}:`, error.message);
            return null;
          }
        })
      );

      const validEmails = emailDetails.filter(e => e !== null);

      console.log(`[fetch_emails] Successfully fetched ${validEmails.length} email details`);

      return JSON.stringify({
        success: true,
        emails: validEmails,
        total: messages.length,
      }, null, 2);
    } catch (error: any) {
      console.error(`[fetch_emails] Error:`, error);
      return JSON.stringify({
        error: true,
        message: `Error fetching emails: ${error.message}`,
        details: error.toString(),
      }, null, 2);
    }
  },
});

/**
 * Tool: Categorize an email
 */
const categorizeEmailTool = createTool({
  name: "categorize_email",
  description: "Analyzes an email and determines its category (Primary, Social, Promotions, Updates, Work, Personal, Spam, etc.)",
  parameters: z.object({
    emailId: z.string().describe("The Gmail message ID"),
    userId: z.string().describe("The user ID"),
    teamId: z.string().nullable().default(null).describe("Optional team ID"),
    subject: z.string().describe("Email subject"),
    from: z.string().describe("Email sender"),
    snippet: z.string().default("").describe("Email preview/snippet"),
  }),
  handler: async ({ emailId, userId, teamId, subject, from, snippet }: {
    emailId: string;
    userId: string;
    teamId?: string | null;
    subject: string;
    from: string;
    snippet?: string;
  }) => {
    // This will be handled by the AI agent to determine category
    return JSON.stringify({
      emailId,
      category: "PENDING_AI_ANALYSIS",
      subject,
      from,
      snippet,
    });
  },
});

/**
 * Color mapping for different label types
 * Gmail API uses color IDs - we'll map our categories to Gmail's predefined colors
 */
const LABEL_COLOR_MAP: Record<string, { backgroundColor: string; textColor: string }> = {
  "Work": { backgroundColor: "#3c78d8", textColor: "#ffffff" }, // Blue
  "Projects": { backgroundColor: "#4986e7", textColor: "#ffffff" }, // Light Blue
  "Meetings": { backgroundColor: "#2da2bb", textColor: "#ffffff" }, // Cyan
  "Urgent": { backgroundColor: "#e07798", textColor: "#ffffff" }, // Pink
  "Important": { backgroundColor: "#fad165", textColor: "#000000" }, // Yellow
  "Follow-up": { backgroundColor: "#fb4c2f", textColor: "#ffffff" }, // Red
  "Personal": { backgroundColor: "#b99aff", textColor: "#ffffff" }, // Purple
  "Family": { backgroundColor: "#c6dafc", textColor: "#000000" }, // Light Blue
  "Friends": { backgroundColor: "#a2dcc1", textColor: "#000000" }, // Mint
  "Receipts": { backgroundColor: "#16a765", textColor: "#ffffff" }, // Green
  "Bills": { backgroundColor: "#fa573c", textColor: "#ffffff" }, // Red Orange
  "Invoices": { backgroundColor: "#ffad46", textColor: "#000000" }, // Orange
  "Travel": { backgroundColor: "#42d692", textColor: "#000000" }, // Teal
  "Bookings": { backgroundColor: "#16a765", textColor: "#ffffff" }, // Green
  "Itinerary": { backgroundColor: "#4a86e8", textColor: "#ffffff" }, // Blue
  "Notifications": { backgroundColor: "#a479e2", textColor: "#ffffff" }, // Purple
  "default": { backgroundColor: "#cca6ac", textColor: "#000000" }, // Gray
};

/**
 * Get color for a label based on its name
 */
function getLabelColor(labelName: string): { backgroundColor: string; textColor: string } {
  if (LABEL_COLOR_MAP[labelName]) {
    return LABEL_COLOR_MAP[labelName];
  }
  
  const lowerName = labelName.toLowerCase();
  for (const [key, color] of Object.entries(LABEL_COLOR_MAP)) {
    if (key.toLowerCase() === lowerName) {
      return color;
    }
  }
  
  if (lowerName.includes("work") || lowerName.includes("project")) {
    return LABEL_COLOR_MAP["Work"];
  }
  if (lowerName.includes("urgent") || lowerName.includes("important")) {
    return LABEL_COLOR_MAP["Important"];
  }
  if (lowerName.includes("follow") || lowerName.includes("action")) {
    return LABEL_COLOR_MAP["Follow-up"];
  }
  if (lowerName.includes("personal") || lowerName.includes("family")) {
    return LABEL_COLOR_MAP["Personal"];
  }
  if (lowerName.includes("receipt") || lowerName.includes("bill") || lowerName.includes("invoice")) {
    return LABEL_COLOR_MAP["Receipts"];
  }
  
  return LABEL_COLOR_MAP["default"];
}

/**
 * Tool: Apply label to email in Gmail
 * This version ACTUALLY applies the label using Gmail API WITH COLORS
 */
const labelEmailTool = createTool({
  name: "label_email",
  description: "Applies a label to an email in Gmail. Creates the label if it doesn't exist with appropriate color.",
  parameters: z.object({
    emailId: z.string().describe("The Gmail message ID"),
    labelName: z.string().describe("The label name to apply (e.g., 'Work', 'Personal', 'Important', 'Follow-up')"),
    userId: z.string().describe("The user ID"),
    teamId: z.string().nullable().default(null).describe("Optional team ID"),
  }),
  handler: async ({ emailId, labelName, userId, teamId }: {
    emailId: string;
    labelName: string;
    userId: string;
    teamId?: string | null;
  }) => {
    try {
      const client = new GmailClient(userId, teamId || null);
      await client.connect();
      
      console.log(`[label_email] Applying label "${labelName}" to email ${emailId}`);
      
      // Get color for this label
      const color = getLabelColor(labelName);
      
      // Apply the label using the Gmail API with color
      const result = await client.applyLabelWithColor(emailId, labelName, color);
      
      return JSON.stringify({
        success: true,
        emailId,
        labelName,
        labelId: result.labelId,
        created: result.created,
        color: color,
        message: result.created 
          ? `Label "${labelName}" created with color and applied successfully`
          : `Label "${labelName}" applied successfully`,
      });
    } catch (error: any) {
      console.error(`[label_email] Error:`, error);
      return JSON.stringify({
        error: true,
        message: `Error labeling email: ${error.message}`,
      });
    }
  },
});

/**
 * Category color mapping
 */
const CATEGORY_COLORS: Record<string, { backgroundColor: string; textColor: string }> = {
  PRIMARY: { backgroundColor: "#1a73e8", textColor: "#ffffff" },
  SOCIAL: { backgroundColor: "#34a853", textColor: "#ffffff" },
  PROMOTIONS: { backgroundColor: "#ea4335", textColor: "#ffffff" },
  UPDATES: { backgroundColor: "#fbbc04", textColor: "#000000" },
  FORUMS: { backgroundColor: "#9334e6", textColor: "#ffffff" },
};

/**
 * Tool: Move email to category (Gmail category)
 * This version ACTUALLY moves the email using Gmail API
 */
const moveToCategoryTool = createTool({
  name: "move_to_category",
  description: "Moves an email to a Gmail category (Primary, Social, Promotions, Updates, Forums).",
  parameters: z.object({
    emailId: z.string().describe("The Gmail message ID"),
    category: z.enum(["PRIMARY", "SOCIAL", "PROMOTIONS", "UPDATES", "FORUMS"]).describe("Gmail category"),
    userId: z.string().describe("The user ID"),
    teamId: z.string().nullable().default(null).describe("Optional team ID"),
  }),
  handler: async ({ emailId, category, userId, teamId }: {
    emailId: string;
    category: string;
    userId: string;
    teamId?: string | null;
  }) => {
    try {
      const client = new GmailClient(userId, teamId || null);
      await client.connect();
      
      console.log(`[move_to_category] Moving email ${emailId} to category ${category}`);
      
      // Gmail categories are special system labels
      const categoryLabelMap: Record<string, string> = {
        PRIMARY: "CATEGORY_PERSONAL",
        SOCIAL: "CATEGORY_SOCIAL",
        PROMOTIONS: "CATEGORY_PROMOTIONS",
        UPDATES: "CATEGORY_UPDATES",
        FORUMS: "CATEGORY_FORUMS",
      };

      const categoryLabelId = categoryLabelMap[category.toUpperCase()];
      
      if (!categoryLabelId) {
        throw new Error(`Invalid category: ${category}`);
      }

      // Move to category using Gmail API
      await client.moveToCategory(emailId, categoryLabelId);

      return JSON.stringify({
        success: true,
        emailId,
        category,
        categoryLabelId,
        color: CATEGORY_COLORS[category.toUpperCase()] || CATEGORY_COLORS.PRIMARY,
        message: "Email categorized successfully",
      });
    } catch (error: any) {
      console.error(`[move_to_category] Error:`, error);
      return JSON.stringify({
        error: true,
        message: `Error moving email to category: ${error.message}`,
      });
    }
  },
});

/**
 * Email object schema for segmentation
 */
const emailSchema = z.object({
  id: z.string().nullable(),
  subject: z.string().nullable(),
  from: z.string().nullable(),
  snippet: z.string().nullable(),
  date: z.string().nullable(),
});

/**
 * Tool: Segment emails into groups
 */
const segmentEmailsTool = createTool({
  name: "segment_emails",
  description: "Segments a list of emails into different groups based on criteria (sender, subject, content, date, etc.)",
  parameters: z.object({
    emails: z.array(emailSchema).describe("Array of email objects with id, subject, from, snippet, date"),
    segmentBy: z.enum(["sender", "subject", "date", "importance", "category"]).describe("How to segment"),
  }),
  handler: async ({ emails, segmentBy }: {
    emails: Array<{ id: string | null; subject: string | null; from: string | null; snippet: string | null; date: string | null }>;
    segmentBy: string;
  }) => {
    return JSON.stringify({
      emails,
      segmentBy,
      segments: "PENDING_AI_ANALYSIS",
    });
  },
});

/**
 * AgentKit agent for email management
 */
const emailManagementAgent = createAgent({
  name: "Email Management Agent",
  system: `You are an intelligent email management assistant that helps users organize their Gmail inbox.

Your capabilities:
1. **Auto-categorization**: Analyze emails and determine their category (Primary, Social, Promotions, Updates, Work, Personal, Spam)
2. **Labeling**: Apply appropriate labels for organization with colors
3. **Segmentation**: Group emails by sender, subject, date, importance, or category
4. **Gmail Integration**: Directly interact with Gmail using the Gmail API

When processing emails:
- Analyze the subject, sender, and content snippet
- Determine the most appropriate category
- Apply relevant labels for easy organization (labels will have colors automatically)
- Move emails to appropriate Gmail categories
- Segment emails into logical groups

Be intelligent and context-aware:
- Recognize important emails from known contacts
- Identify promotional emails (newsletters, marketing)
- Detect social notifications (Facebook, Twitter, LinkedIn, etc.)
- Categorize work-related emails
- Flag urgent emails
- Identify follow-up needed

Common label categories to use:
- Work, Projects, Meetings (for professional emails)
- Personal, Family, Friends (for personal emails)
- Receipts, Bills, Invoices (for financial emails)
- Travel, Bookings, Itinerary (for travel-related emails)
- Notifications (for service notifications)
- Urgent, Important, Follow-up (for priority emails)

IMPORTANT: Process ONE email at a time. Complete all actions for one email before moving to the next.

Always provide clear reasoning for your categorization and labeling decisions.`,
  model: openai({ model: "gpt-4o" }),
  tools: [
    fetchEmailsTool,
    categorizeEmailTool,
    labelEmailTool,
    moveToCategoryTool,
    segmentEmailsTool,
  ],
});

/**
 * AgentKit network for email management
 */
export const emailManagementNetwork = createNetwork({
  name: "Email Management Network",
  defaultModel: openai({ model: "gpt-4o" }),
  agents: [emailManagementAgent],
  router: ({ callCount }: { callCount: number }) => {
    if (callCount < 15) {
      return emailManagementAgent;
    }
    return undefined;
  },
});

/**
 * Process emails in batches to avoid parallel step conflicts
 */
export async function processUserEmails(userId: string, teamId: string | null = null) {
  const BATCH_SIZE = 5; // Process 5 emails at a time
  const MAX_BATCHES = 2; // Process max 10 emails total (2 batches × 5 emails)
  
  let totalActions = 0;
  let allMessages: any[] = [];
  
  console.log(`[processUserEmails] Starting batched email processing for user ${userId}`);
  
  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const batchNum = batch + 1;
    console.log(`[processUserEmails] Processing batch ${batchNum}/${MAX_BATCHES}`);
    
    const prompt = `Process batch ${batchNum} of emails for user ${userId}.

Steps:
1. Fetch ${BATCH_SIZE} unread emails from Gmail inbox (use query "is:unread in:inbox" with maxResults of ${BATCH_SIZE})
2. For EACH email in this batch, ONE AT A TIME:
   - Analyze the subject, sender, and content snippet
   - Apply the SINGLE most relevant label (choose ONE label that best describes the email)
   - The label will automatically get an appropriate color
   
CRITICAL: Process emails SEQUENTIALLY, one by one. Complete all actions for one email before starting the next.

After processing all ${BATCH_SIZE} emails in this batch, provide a brief summary of what you did.`;

    try {
      const result = await emailManagementNetwork.run(prompt);
      const messages = (result as any).messages || [];
      
      allMessages = [...allMessages, ...messages];
      const batchActions = messages.filter((m: any) => m.role === "tool").length;
      totalActions += batchActions;
      
      console.log(`[processUserEmails] Batch ${batchNum} complete. Actions taken: ${batchActions}`);
      
      // Small delay between batches to avoid rate limits and ensure sequential processing
      if (batch < MAX_BATCHES - 1) {
        console.log(`[processUserEmails] Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error: any) {
      console.error(`[processUserEmails] Error in batch ${batchNum}:`, error);
      // Continue with next batch even if one fails
    }
  }
  
  console.log(`[processUserEmails] All batches complete. Total actions: ${totalActions}`);
  
  return {
    messages: allMessages,
    actions: totalActions,
    success: true,
    batches: MAX_BATCHES,
  };
}