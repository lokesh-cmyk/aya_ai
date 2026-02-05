import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  searchMemories,
  storeMemoryAsync,
  isMem0Configured,
  type Memory,
} from '@/lib/mem0';
import { COMPOSIO_APPS, getIntegrationsCallbackUrl } from '@/lib/composio-tools';

export type ConnectAction = { connectLink: string; connectAppName: string };

// All available integrations in the platform
interface IntegrationInfo {
  name: string;
  description: string;
  features: string[];
  settingsPath: string;
  composioApp?: keyof typeof COMPOSIO_APPS;
}

const AVAILABLE_INTEGRATIONS: Record<string, IntegrationInfo> = {
  googleCalendar: {
    name: 'Google Calendar',
    description: 'View, create, and manage calendar events',
    features: ['View upcoming events', 'Create new events', 'Check availability', 'Get meeting reminders'],
    settingsPath: '/settings/integrations',
    composioApp: 'googlecalendar',
  },
  clickup: {
    name: 'ClickUp',
    description: 'Task and project management',
    features: ['View tasks', 'Create tasks', 'Update task status', 'Manage projects'],
    settingsPath: '/settings/integrations',
    composioApp: 'clickup',
  },
  instagram: {
    name: 'Instagram',
    description: 'Social media management for Instagram',
    features: ['View DMs', 'Check insights', 'Manage content'],
    settingsPath: '/settings/integrations',
    composioApp: 'instagram',
  },
  linkedin: {
    name: 'LinkedIn',
    description: 'Professional networking and content',
    features: ['Create posts', 'Share updates', 'View profile info'],
    settingsPath: '/settings/integrations',
    composioApp: 'linkedin',
  },
  gmail: {
    name: 'Gmail',
    description: 'Email management and insights',
    features: ['View recent emails', 'Search emails', 'Get email summaries'],
    settingsPath: '/settings/integrations',
  },
  meetings: {
    name: 'Meeting Bot',
    description: 'AI-powered meeting recording and transcription',
    features: ['Auto-join meetings', 'Transcribe conversations', 'Generate summaries', 'Extract action items'],
    settingsPath: '/meetings/settings',
  },
  slack: {
    name: 'Slack',
    description: 'Team communication',
    features: ['Send messages', 'View channels', 'Search conversations'],
    settingsPath: '/settings/integrations',
  },
};

// Map model names to Claude model IDs
const modelMap: Record<string, string> = {
  'opus-4.5': 'claude-opus-4-5-20251101',
  'sonnet-4.5': 'claude-sonnet-4-5-20250929',
  'haiku-4.5': 'claude-haiku-4-5-20251001',
};

// Check which integrations are connected for a user
async function getConnectedIntegrations(userId: string, teamId?: string | null): Promise<{
  connected: string[];
  disconnected: string[];
  integrationStatus: Record<string, boolean>;
}> {
  const integrationStatus: Record<string, boolean> = {};

  // Check Prisma Integration model for connected services
  const dbIntegrations = await prisma.integration.findMany({
    where: {
      OR: [
        { userId },
        ...(teamId ? [{ teamId }] : []),
      ],
      isActive: true,
    },
    select: { name: true, type: true },
  });

  // Map DB integration names to our integration keys
  const connectedNames = dbIntegrations.map(i => i.name.toLowerCase());

  // Check each integration
  for (const key of Object.keys(AVAILABLE_INTEGRATIONS)) {
    const info = AVAILABLE_INTEGRATIONS[key];
    // Check if connected via DB integrations or if it's a Composio app that might be connected
    const isConnected = connectedNames.some(n =>
      n === key.toLowerCase() ||
      n === info.name.toLowerCase() ||
      n.includes(key.toLowerCase())
    );
    integrationStatus[key] = isConnected;
  }

  // Meeting bot is "connected" if user has meetingBotSettings or any meetings
  const hasMeetings = await prisma.meeting.count({
    where: { userId },
    take: 1,
  });
  integrationStatus['meetings'] = hasMeetings > 0 || !!process.env.MEETINGBAAS_API_KEY;

  // Gmail/Email is connected if there are email messages
  const hasEmails = await prisma.message.count({
    where: {
      OR: [
        { userId },
        ...(teamId ? [{ contact: { teamId } }] : []),
      ],
      channel: 'EMAIL',
    },
    take: 1,
  });
  integrationStatus['gmail'] = hasEmails > 0;

  const connected = Object.entries(integrationStatus)
    .filter(([_, status]) => status)
    .map(([key]) => key);

  const disconnected = Object.entries(integrationStatus)
    .filter(([_, status]) => !status)
    .map(([key]) => key);

  return { connected, disconnected, integrationStatus };
}

// POST: Stream AI response
export async function POST(request: NextRequest) {
  let userMessageId: string | null = null;
  let conversationId: string | null = null;

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("better-auth.session_token");

    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Please sign in to continue' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Please sign in to continue' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { conversationId: convId, message, model, files, pastedContent, isThinkingEnabled } = body;
    conversationId = convId;

    if (!conversationId || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify conversation belongs to user
    const conversation = await (prisma as any).aIChatConversation.findFirst({
      where: {
        id: conversationId,
        userId: session.user.id,
      },
    });

    if (!conversation) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Save user message first
    const userMessage = await (prisma as any).aIChatMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: message,
        metadata: {
          files: files || [],
          pastedContent: pastedContent || [],
          isThinkingEnabled,
        },
      },
    });
    userMessageId = userMessage.id;

    // Update conversation title if it's the first message
    if (!conversation.title || conversation.title === 'New Conversation') {
      const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      await (prisma as any).aIChatConversation.update({
        where: { id: conversationId },
        data: { title },
      });
    }

    // Get conversation history for context
    const history = await (prisma as any).aIChatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // Get user's data for AI context
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        team: {
          include: {
            spaces: {
              include: {
                taskLists: {
                  include: {
                    tasks: {
                      take: 10,
                      orderBy: { dueDate: 'asc' },
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

    // Get recent emails
    const recentMessages = await prisma.message.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { contact: { teamId: user?.teamId } },
        ],
        channel: 'EMAIL',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { contact: true },
    });

    // Get recent meetings with insights
    const recentMeetings = await prisma.meeting.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          ...(user?.teamId ? [{ teamId: user.teamId }] : []),
        ],
      },
      orderBy: { scheduledStart: 'desc' },
      take: 10,
      include: {
        insights: { where: { type: { in: ['summary', 'action_items', 'key_topics'] } } },
        participants: { select: { name: true } },
      },
    });

    // Build AI context
    const context = {
      user: { name: user?.name, email: user?.email, team: user?.team?.name },
      projects: user?.team?.spaces?.map(space => ({
        name: space.name,
        description: space.description,
        tasks: space.taskLists.flatMap(list =>
          list.tasks
            .filter(task => {
              if (task.status?.name === 'CLOSED') {
                return task.dueDate && new Date(task.dueDate) >= new Date();
              }
              return true;
            })
            .map(task => ({
              name: task.name,
              description: task.description,
              priority: task.priority,
              status: task.status?.name || 'OPEN',
              dueDate: task.dueDate,
              assignee: task.assignee?.name || null,
            }))
        ),
      })) || [],
      recentEmails: recentMessages.map((m) => {
        const metadata = m.metadata as any;
        return {
          from: m.contact?.email || 'Unknown',
          subject: metadata?.subject || m.content?.substring(0, 50) || 'No subject',
          snippet: m.content?.substring(0, 100) || '',
          date: m.createdAt,
        };
      }),
      meetings: recentMeetings.map((meeting) => {
        const summaryInsight = meeting.insights.find((i) => i.type === 'summary');
        const actionItemsInsight = meeting.insights.find((i) => i.type === 'action_items');
        const keyTopicsInsight = meeting.insights.find((i) => i.type === 'key_topics');

        let actionItems: Array<{ task: string; owner?: string }> = [];
        let keyTopics: string[] = [];

        try {
          if (actionItemsInsight) actionItems = JSON.parse(actionItemsInsight.content);
          if (keyTopicsInsight) keyTopics = JSON.parse(keyTopicsInsight.content);
        } catch {}

        return {
          id: meeting.id,
          title: meeting.title,
          date: meeting.scheduledStart,
          duration: meeting.duration ? Math.round(meeting.duration / 60) : null,
          status: meeting.status,
          participants: meeting.participants.map((p) => p.name),
          summary: summaryInsight?.content || null,
          actionItems,
          keyTopics,
        };
      }),
    };

    const claudeModel = modelMap[model] || modelMap['sonnet-4.5'];

    // Get connected integrations
    const integrations = await getConnectedIntegrations(session.user.id, user?.teamId);

    // Search for relevant memories if mem0 is configured
    let relevantMemories: Memory[] = [];
    if (isMem0Configured()) {
      try {
        relevantMemories = await searchMemories(session.user.id, message, {
          top_k: 5,
          threshold: 0.3,
        });
      } catch (error) {
        console.error('[ai-chat/stream] Failed to fetch memories:', error);
        // Continue without memories - graceful degradation
      }
    }

    // Build system prompt with memories and integrations
    const systemPrompt = buildSystemPrompt(context, relevantMemories, integrations);

    // Build messages array
    const messages = history
      .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
    messages.push({ role: 'user' as const, content: message });

    // Create streaming response using ReadableStream
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await streamText({
            model: anthropic(claudeModel),
            system: systemPrompt,
            messages,
            maxOutputTokens: isThinkingEnabled ? 4096 : 2048,
          });

          // Stream the text
          for await (const textPart of result.textStream) {
            fullResponse += textPart;
            // Send as SSE format
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: textPart })}\n\n`));
          }

          // Parse connect actions from the response for agentic UI
          const connectActions = parseConnectActions(fullResponse);
          const cleanedResponse = cleanResponseText(fullResponse);

          // Build metadata with connect actions
          const messageMetadata: Record<string, any> = {
            thinking: isThinkingEnabled ? 'Extended thinking enabled' : undefined,
          };
          if (connectActions.length > 0) {
            messageMetadata.connectActions = connectActions;
            messageMetadata.connectLink = connectActions[0].connectLink;
            messageMetadata.connectAppName = connectActions[0].connectAppName;
          }

          // Save assistant message after streaming completes (with cleaned content)
          await (prisma as any).aIChatMessage.create({
            data: {
              conversationId,
              role: 'assistant',
              content: cleanedResponse || 'I couldn\'t generate a response.',
              model: claudeModel,
              metadata: messageMetadata,
            },
          });

          // Update conversation timestamp
          await (prisma as any).aIChatConversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          // Store conversation to mem0 for memory extraction (async, non-blocking)
          if (isMem0Configured() && cleanedResponse) {
            storeMemoryAsync(session.user.id, [
              { role: 'user', content: message },
              { role: 'assistant', content: cleanedResponse },
            ], {
              conversationId,
              timestamp: new Date().toISOString(),
              model: claudeModel,
            });
          }

          // Send connect actions to client for agentic UI (before done signal)
          if (connectActions.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ connectActions })}\n\n`));
          }

          // Send done signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error: any) {
          console.error('[ai-chat/stream] Stream error:', error);
          const errorMessage = getErrorMessage(error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-User-Message-Id': userMessageId || '',
        'X-Conversation-Id': conversationId || '',
      },
    });

  } catch (error: any) {
    console.error('[ai-chat/stream] Error:', error);
    const errorMessage = getErrorMessage(error);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function getErrorMessage(error: any): string {
  // Handle common error types with friendly messages
  const message = error?.message || String(error);

  if (message.includes('API key') || message.includes('api_key') || message.includes('unauthorized')) {
    return 'AI service is not configured properly. Please contact support.';
  }

  if (message.includes('rate limit') || message.includes('429')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return 'The request took too long. Please try again.';
  }

  if (message.includes('network') || message.includes('ECONNREFUSED')) {
    return 'Network error. Please check your connection and try again.';
  }

  if (message.includes('context length') || message.includes('too long')) {
    return 'The conversation is too long. Please start a new chat.';
  }

  // Default friendly message
  return 'Something went wrong. Please try again.';
}

function buildSystemPrompt(
  context: any,
  memories: Memory[] = [],
  integrations?: { connected: string[]; disconnected: string[]; integrationStatus: Record<string, boolean> }
): string {
  let prompt = `You are AYA, an AI assistant in the Unified Box platform. You help users with project management, communication, meetings, and productivity across their connected services.

## Your Capabilities

You have access to:
- User's ongoing projects and tasks (built-in task management)
- Recent emails and messages
- Recent meetings with AI-generated summaries, action items, and key topics
- Team information and collaboration features
- Long-term memories about this user's preferences and past interactions

## Available Integrations

The Unified Box platform supports the following integrations:
`;

  // Add integration status
  for (const [key, info] of Object.entries(AVAILABLE_INTEGRATIONS)) {
    const isConnected = integrations?.integrationStatus[key] ?? false;
    const status = isConnected ? '✅ Connected' : '❌ Not Connected';
    prompt += `\n**${info.name}** (${status})
- ${info.description}
- Features: ${info.features.join(', ')}`;
    if (!isConnected) {
      prompt += `\n- To connect: Go to Settings > Integrations or navigate to ${info.settingsPath}`;
    }
  }

  prompt += `

## Response Guidelines

1. When a user asks about a **connected** integration, provide helpful information using the available data.

2. When a user asks about a **disconnected** integration, respond helpfully:
   - Acknowledge what they're trying to do
   - Explain that the integration is not yet connected
   - Guide them to connect it (Settings > Integrations page)
   - **IMPORTANT**: If the service supports connection, include this EXACT format in your response so we can show a Connect button:

   [CONNECT_ACTION:integrationName:Display Name]

   For example:
   - For Google Calendar: [CONNECT_ACTION:googleCalendar:Google Calendar]
   - For ClickUp: [CONNECT_ACTION:clickup:ClickUp]
   - For Instagram: [CONNECT_ACTION:instagram:Instagram]
   - For LinkedIn: [CONNECT_ACTION:linkedin:LinkedIn]

   Only include ONE connect action per response, for the primary service the user is asking about.

3. Be concise and helpful. Use your memories about this user to personalize responses naturally.

4. For meeting-related questions, use the provided meeting context to summarize, find action items, or help with follow-ups.
`;

  // Add memories section if available
  if (memories.length > 0) {
    prompt += `\n## What You Remember About This User:\n`;
    memories.forEach((m) => {
      prompt += `- ${m.memory}\n`;
    });
    prompt += `\nUse these memories to personalize your responses. Reference past conversations and preferences when relevant, but don't be repetitive about it.`;
  }

  prompt += `

## Current Context

- User: ${context.user.name} (${context.user.email})
- Team: ${context.user.team || 'No team'}
- Active Projects: ${context.projects.length}
- Recent Emails: ${context.recentEmails.length}
- Recent Meetings: ${context.meetings?.length || 0}`;

  if (context.projects.length > 0) {
    prompt += `\n\n### Projects:\n${context.projects.map((p: any) => `- ${p.name}: ${p.tasks.length} tasks`).join('\n')}`;
  }

  if (context.recentEmails.length > 0) {
    prompt += `\n\n### Recent Emails:\n${context.recentEmails.map((e: any) => `- From ${e.from}: ${e.subject}`).join('\n')}`;
  }

  // Add meetings section
  if (context.meetings?.length > 0) {
    prompt += `\n\n### Recent Meetings:\n${context.meetings.map((m: any) => {
      let info = `- ${m.title} (${new Date(m.date).toLocaleDateString()})`;
      if (m.status === 'COMPLETED') {
        if (m.participants?.length > 0) info += ` - Participants: ${m.participants.join(', ')}`;
        if (m.summary) info += `\n  Summary: ${m.summary.substring(0, 300)}...`;
        if (m.actionItems?.length > 0) info += `\n  Action Items: ${m.actionItems.map((a: any) => a.task).join('; ')}`;
        if (m.keyTopics?.length > 0) info += `\n  Key Topics: ${m.keyTopics.join(', ')}`;
      } else {
        info += ` [Status: ${m.status}]`;
      }
      return info;
    }).join('\n')}`;
  }

  return prompt;
}

// Parse connect actions from AI response
function parseConnectActions(text: string): ConnectAction[] {
  const actions: ConnectAction[] = [];
  const regex = /\[CONNECT_ACTION:(\w+):([^\]]+)\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const integrationKey = match[1];
    const displayName = match[2];
    const info = AVAILABLE_INTEGRATIONS[integrationKey];

    if (info) {
      // Build connect URL - use Composio connect API with redirect for OAuth apps
      let connectLink: string;
      if (info.composioApp) {
        // For Composio-backed integrations, use the connect API endpoint with redirect
        connectLink = `/api/integrations/composio/connect?app=${info.composioApp}&redirect=true`;
      } else {
        // For non-Composio integrations, direct to settings page
        connectLink = info.settingsPath;
      }

      actions.push({
        connectLink,
        connectAppName: displayName,
      });
    }
  }

  return actions;
}

// Remove connect action markers from text
function cleanResponseText(text: string): string {
  return text.replace(/\[CONNECT_ACTION:[^\]]+\]/g, '').trim();
}
