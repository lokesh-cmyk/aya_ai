/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { prisma } from "@/lib/prisma";
import {
  searchMemories,
  storeMemoryAsync,
  isMem0Configured,
  type Memory,
} from "@/lib/mem0";
import { getComposioSessionTools } from "@/lib/composio-tools";
import { getSearchAndWeatherTools } from "@/lib/tools";
import { formatForWhatsApp, splitMessage } from "./formatter";
import { isDigestToggle, isMeetingSummaryToggle } from "./classifier";
import { getNotesAndReminderTools } from "./tools";
import {
  sendText,
  startTyping,
  stopTyping,
  sendSeen,
  toChatId,
} from "@/lib/integrations/waha";

const CONVERSATION_TIMEOUT_HOURS = 24;
const MAX_HISTORY_MESSAGES = 20;

interface ProcessResult {
  messages: string[];
  conversationId: string;
}

interface UserContext {
  id: string;
  name: string | null;
  email: string;
  teamId: string | null;
  timezone: string | null;
  whatsappDigestEnabled: boolean;
  whatsappMeetingSummaryEnabled: boolean;
}

/**
 * Process a WhatsApp message from an identified user.
 * Handles conversation management, AI invocation, and response formatting.
 */
export async function processMessage(
  user: UserContext,
  phone: string,
  messageText: string,
  wahaMessageId: string | null,
  includeTools: boolean = false
): Promise<ProcessResult> {
  const chatId = toChatId(phone);

  // Send seen receipt
  if (wahaMessageId) {
    await sendSeen(chatId, wahaMessageId).catch(() => {});
  }

  // Show typing indicator
  await startTyping(chatId).catch(() => {});

  try {
    // Check for digest opt-in/opt-out
    const digestToggle = isDigestToggle(messageText);
    if (digestToggle.isToggle) {
      return await handleDigestToggle(user, phone, digestToggle.enable);
    }

    // Check for meeting summary opt-in/opt-out
    const meetingSummaryToggle = isMeetingSummaryToggle(messageText);
    if (meetingSummaryToggle.isToggle) {
      return await handleMeetingSummaryToggle(user, phone, meetingSummaryToggle.enable);
    }

    // Get or create active conversation
    const conversation = await getOrCreateConversation(user.id);

    // Deduplicate by wahaMessageId
    if (wahaMessageId) {
      const existing = await prisma.whatsAppMessage.findUnique({
        where: { wahaMessageId },
      });
      if (existing) {
        return { messages: [], conversationId: conversation.id };
      }
    }

    // Store user message
    await prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: messageText,
        wahaMessageId,
      },
    });

    // Load conversation history (most recent messages, then reverse for chronological order)
    const history = await prisma.whatsAppMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: MAX_HISTORY_MESSAGES,
    });
    history.reverse();

    // Build AI context (same as web chat)
    const userData = await loadUserContext(user.id, user.teamId);

    // Always load web search & weather tools (both simple + complex paths)
    let tools: any = { ...getSearchAndWeatherTools() };

    if (includeTools) {
      // Add notes & reminders tools on complex path
      const customTools = getNotesAndReminderTools(user.id, user.timezone);
      tools = { ...tools, ...customTools };

      // Add Composio tools (external integrations)
      try {
        const sessionTools = await getComposioSessionTools(user.id);
        tools = { ...sessionTools.tools, ...tools };
      } catch (e) {
        console.warn("[whatsapp] Failed to load Composio tools:", e);
      }
    }

    // Load memories
    let memories: Memory[] = [];
    if (isMem0Configured()) {
      try {
        memories = await searchMemories(user.id, messageText, {
          top_k: 5,
          threshold: 0.3,
        });
      } catch (e) {
        console.warn("[whatsapp] Failed to load memories:", e);
      }
    }

    // Build system prompt
    const systemPrompt = buildWhatsAppSystemPrompt(userData, memories, user);

    // Build messages array for Claude
    const messages = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Generate AI response (non-streaming for WhatsApp)
    const hasTools = Object.keys(tools).length > 0;
    const result = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: systemPrompt,
      messages,
      ...(hasTools
        ? {
            tools,
            maxSteps: 5,
          }
        : {}),
    });

    const responseText = result.text || "I couldn't generate a response. Please try again.";

    // Format for WhatsApp and split if needed
    const formatted = formatForWhatsApp(responseText);
    const chunks = splitMessage(formatted);

    // Store assistant response
    await prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: responseText,
        metadata: {
          toolCalls: result.toolCalls?.map((tc) => ({
            name: tc.toolName,
            args: (tc as any).args ?? (tc as any).input,
          })),
          model: "claude-sonnet-4-5-20250929",
          includeTools,
        } as any,
      },
    });

    // Update preferred language (detect from user message)
    await detectAndUpdateLanguage(conversation.id, messageText);

    // Store memory async (fire-and-forget)
    if (isMem0Configured()) {
      storeMemoryAsync(user.id, [
        { role: "user", content: messageText },
        { role: "assistant", content: responseText },
      ]);
    }

    return { messages: chunks, conversationId: conversation.id };
  } finally {
    await stopTyping(chatId).catch(() => {});
  }
}

/**
 * Handle digest opt-in/opt-out
 */
async function handleDigestToggle(
  user: UserContext,
  phone: string,
  enable: boolean
): Promise<ProcessResult> {
  await prisma.user.update({
    where: { id: user.id },
    data: { whatsappDigestEnabled: enable },
  });

  const conversation = await getOrCreateConversation(user.id);
  const message = enable
    ? "Daily standup digest has been *turned on*! You'll receive it every morning at 8 AM your time."
    : "Daily standup digest has been *paused*. You can turn it back on anytime by asking me!";

  return { messages: [message], conversationId: conversation.id };
}

/**
 * Handle meeting summary opt-in/opt-out
 */
async function handleMeetingSummaryToggle(
  user: UserContext,
  phone: string,
  enable: boolean
): Promise<ProcessResult> {
  await prisma.user.update({
    where: { id: user.id },
    data: { whatsappMeetingSummaryEnabled: enable },
  });

  const conversation = await getOrCreateConversation(user.id);
  const message = enable
    ? "Post-meeting summaries have been *turned on*! You'll receive a summary with action items on WhatsApp 15 minutes after each meeting ends."
    : "Post-meeting summaries have been *turned off*. You can turn them back on anytime by asking me!";

  return { messages: [message], conversationId: conversation.id };
}

/**
 * Get or create an active conversation for a user.
 * Resets conversation if last message was >24 hours ago.
 */
async function getOrCreateConversation(userId: string) {
  const existing = await prisma.whatsAppConversation.findFirst({
    where: { userId, isActive: true },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (existing) {
    const lastMessage = existing.messages[0];
    if (lastMessage) {
      const hoursSinceLastMessage =
        (Date.now() - lastMessage.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastMessage > CONVERSATION_TIMEOUT_HOURS) {
        await prisma.whatsAppConversation.update({
          where: { id: existing.id },
          data: { isActive: false },
        });
        return prisma.whatsAppConversation.create({
          data: { userId, isActive: true },
          include: { messages: true },
        });
      }
    }
    return existing;
  }

  return prisma.whatsAppConversation.create({
    data: { userId, isActive: true },
    include: { messages: true },
  });
}

/**
 * Load full user context for AI
 */
async function loadUserContext(userId: string, teamId: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      team: {
        include: {
          spaces: {
            include: {
              taskLists: {
                include: {
                  tasks: {
                    take: 10,
                    orderBy: { dueDate: "asc" },
                    include: {
                      status: true,
                      assignee: { select: { name: true, email: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const recentEmails = await prisma.message.findMany({
    where: {
      OR: [
        { userId },
        ...(teamId ? [{ contact: { teamId } }] : []),
      ],
      channel: "EMAIL",
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { contact: true },
  });

  const recentMeetings = await prisma.meeting.findMany({
    where: {
      OR: [{ userId }, ...(teamId ? [{ teamId }] : [])],
    },
    orderBy: { scheduledStart: "desc" },
    take: 10,
    include: {
      insights: {
        where: { type: { in: ["summary", "action_items", "key_topics"] } },
      },
      participants: { select: { name: true } },
    },
  });

  return {
    user: {
      name: user?.name,
      email: user?.email,
      team: user?.team?.name,
    },
    projects:
      user?.team?.spaces?.map((space) => ({
        name: space.name,
        description: space.description,
        tasks: space.taskLists.flatMap((list) =>
          list.tasks
            .filter((task) => {
              const status = task.status as any;
              if (status?.name === "CLOSED") {
                return task.dueDate && new Date(task.dueDate) >= new Date();
              }
              return true;
            })
            .map((task) => ({
              name: task.name,
              description: task.description,
              priority: task.priority,
              status: (task.status as any)?.name || "OPEN",
              dueDate: task.dueDate,
              assignee: task.assignee?.name || null,
            }))
        ),
      })) || [],
    recentEmails: recentEmails.map((m) => {
      const metadata = m.metadata as any;
      return {
        from: m.contact?.email || "Unknown",
        subject:
          metadata?.subject || m.content?.substring(0, 50) || "No subject",
        snippet: m.content?.substring(0, 100) || "",
        date: m.createdAt,
      };
    }),
    meetings: recentMeetings.map((meeting) => {
      const summaryInsight = meeting.insights.find((i) => i.type === "summary");
      const actionItemsInsight = meeting.insights.find(
        (i) => i.type === "action_items"
      );
      const keyTopicsInsight = meeting.insights.find(
        (i) => i.type === "key_topics"
      );

      let actionItems: Array<{ task: string; owner?: string }> = [];
      let keyTopics: string[] = [];
      try {
        if (actionItemsInsight)
          actionItems = JSON.parse(actionItemsInsight.content);
        if (keyTopicsInsight)
          keyTopics = JSON.parse(keyTopicsInsight.content);
      } catch {}

      return {
        id: meeting.id,
        title: meeting.title,
        date: meeting.scheduledStart,
        duration: meeting.duration
          ? Math.round(meeting.duration / 60)
          : null,
        status: meeting.status,
        participants: meeting.participants.map((p) => p.name),
        summary: summaryInsight?.content || null,
        actionItems,
        keyTopics,
      };
    }),
  };
}

/**
 * Build WhatsApp-specific system prompt
 */
function buildWhatsAppSystemPrompt(
  context: any,
  memories: Memory[],
  user: UserContext
): string {
  let prompt = `You are AYA, an AI assistant in the Unified Box platform. You are responding via WhatsApp.

## About AYA & Unified Box

AYA is the AI assistant built into Unified Box — an all-in-one business productivity platform. Here's what Unified Box offers:

- *Unified Inbox* — All messages (Email, SMS, WhatsApp, Slack, Instagram DMs, Microsoft Teams) in one place
- *AI Chat* — Conversational AI assistant on the web app with rich UI cards
- *WhatsApp AYA (You!)* — On-the-go AI access via WhatsApp
- *Project Management* — Spaces, task lists, tasks with priorities and assignees
- *Meeting Bot* — AI meeting recording, transcription, and summaries (Google Meet, Zoom, Teams)
- *Integrations* — Google Calendar, ClickUp, Instagram, LinkedIn, Microsoft Teams, Zoom, Slack, Gmail
- *Web Search* — Search the internet for current information
- *Weather* — Check weather and forecasts for any location

When users ask "what can you do?" or "how does this work?", explain relevant features conversationally.

## WhatsApp Formatting Rules
- Use *bold* for emphasis, _italic_ for secondary info
- No markdown tables — use numbered lists instead
- No code blocks longer than 3 lines — describe conversationally
- Keep responses under 500 words. Ask if they want more detail.
- Use line breaks generously for readability
- Emojis are welcome — use them naturally
- Number list items so user can reference by number (e.g., "tell me more about #2")
- For long data (many tasks, many emails), show top 5 and ask "want to see more?"

## MULTILINGUAL — CRITICAL
Always respond in the SAME LANGUAGE the user writes in.
If they write in Hindi, respond in Hindi. If Spanish, respond in Spanish.
If they mix languages (Hinglish, Spanglish), match their style naturally.

## Behavior
- Be concise — WhatsApp is a chat, not an essay
- When executing tools, briefly say what you're doing: "Checking your calendar..."
- NEVER include [CONNECT_ACTION:...] markers or :::component{...}::: blocks — those are for the web UI only
- If the user asks to stop/start daily standup digest, confirm you've done it
- If the user asks to enable/disable post-meeting summaries, confirm you've done it
- When users ask general questions about the platform, guide them helpfully

## Your Capabilities
You have access to:
- User's ongoing projects and tasks
- Recent emails and messages
- Recent meetings with AI-generated summaries
- Team information
- Long-term memories about this user
- Connected integrations (Google Calendar, ClickUp, Slack, Instagram, LinkedIn, Microsoft Teams, Zoom)
- Personal notes (save, search, update, delete)
- Reminders with WhatsApp pings (one-time and recurring)
- Web search (search the internet for current events, news, facts, or any information)
- Weather (get current weather and 3-day forecast for any location)

## Web Search & Weather
- When user asks to search the web, look something up, or asks about current events/news — use the web_search tool. Present results as a numbered list with title and snippet.
- When user asks about weather — use the get_weather tool. Format nicely with emojis:
  Example format:
  *Tokyo, Japan* ☀️
  Temperature: 28°C (feels like 31°C)
  💧 Humidity: 65% | 💨 Wind: 15 km/h

  _3-Day Forecast:_
  1. Today: ☀️ 28°C / 20°C
  2. Fri: ⛅ 25°C / 19°C
  3. Sat: 🌧️ 22°C / 18°C

## Notes & Reminders
- When user says "save this", "note this down", "remember that..." → use save_note tool
- When user says "remind me", "set a reminder", "alert me at..." → use set_reminder tool
- For reminders, convert the user's local time to ISO 8601 using their timezone: ${user.timezone || "UTC"}
- Current date/time: ${new Date().toISOString()}
- For recurring reminders, generate an iCal RRULE string:
  - "every day" → FREQ=DAILY
  - "every weekday" → FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
  - "every Monday" → FREQ=WEEKLY;BYDAY=MO
  - "every Monday and Wednesday" → FREQ=WEEKLY;BYDAY=MO,WE
  - "every month on the 1st" → FREQ=MONTHLY;BYMONTHDAY=1
  - "every 2 weeks" → FREQ=WEEKLY;INTERVAL=2
  - "every day for 30 days" → FREQ=DAILY;COUNT=30
- When listing notes or reminders, show numbered list so user can reference by # (e.g., "delete #2")
- Before deleting a note or cancelling a reminder, confirm with the user first
`;

  // Add memories
  if (memories.length > 0) {
    prompt += `\n## What You Remember About This User:\n`;
    memories.forEach((m) => {
      prompt += `- ${m.memory}\n`;
    });
  }

  // Add current context
  prompt += `\n## Current Context
- User: ${context.user.name} (${context.user.email})
- Team: ${context.user.team || "No team"}
- Active Projects: ${context.projects.length}
- Recent Emails: ${context.recentEmails.length}
- Recent Meetings: ${context.meetings?.length || 0}
- Daily Digest: ${user.whatsappDigestEnabled ? "Enabled" : "Disabled"}
- Post-Meeting Summaries: ${user.whatsappMeetingSummaryEnabled ? "Enabled" : "Disabled"}`;

  if (context.projects.length > 0) {
    prompt += `\n\n### Projects:\n${context.projects.map((p: any) => `- ${p.name}: ${p.tasks.length} tasks`).join("\n")}`;
  }

  if (context.recentEmails.length > 0) {
    prompt += `\n\n### Recent Emails:\n${context.recentEmails.map((e: any) => `- From ${e.from}: ${e.subject}`).join("\n")}`;
  }

  if (context.meetings?.length > 0) {
    prompt += `\n\n### Recent Meetings:\n${context.meetings
      .map((m: any) => {
        let info = `- ${m.title} (${new Date(m.date).toLocaleDateString()})`;
        if (m.status === "COMPLETED" && m.summary) {
          info += `\n  Summary: ${m.summary.substring(0, 200)}`;
        }
        return info;
      })
      .join("\n")}`;
  }

  return prompt;
}

/**
 * Detect language from message and update conversation preference
 */
async function detectAndUpdateLanguage(
  conversationId: string,
  message: string
) {
  let lang = "en";

  // Hindi (Devanagari)
  if (/[\u0900-\u097F]/.test(message)) lang = "hi";
  // Arabic
  else if (/[\u0600-\u06FF]/.test(message)) lang = "ar";
  // Chinese
  else if (/[\u4e00-\u9fff]/.test(message)) lang = "zh";
  // Japanese
  else if (/[\u3040-\u30ff\u31f0-\u31ff]/.test(message)) lang = "ja";
  // Korean
  else if (/[\uac00-\ud7af]/.test(message)) lang = "ko";
  // Spanish common words
  else if (/\b(hola|gracias|por favor|como|buenos|buenas)\b/i.test(message)) lang = "es";
  // French common words
  else if (/\b(bonjour|merci|s'il vous|comment|bonsoir)\b/i.test(message)) lang = "fr";
  // German common words
  else if (/\b(hallo|danke|bitte|guten|morgen|abend)\b/i.test(message)) lang = "de";
  // Portuguese common words
  else if (/\b(obrigado|obrigada|bom dia|boa tarde|como vai)\b/i.test(message)) lang = "pt";

  await prisma.whatsAppConversation.update({
    where: { id: conversationId },
    data: { preferredLanguage: lang },
  });
}
