import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { auth, getSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { streamText, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  searchMemories,
  storeMemoryAsync,
  isMem0Configured,
  type Memory,
} from '@/lib/mem0';
import { COMPOSIO_APPS, getComposio, getComposioSessionTools, getIntegrationsCallbackUrl } from '@/lib/composio-tools';
import { getToolDisplayName, summarizeToolResult } from '@/lib/tool-display-names';

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

  // Check Composio connected accounts for OAuth-based integrations
  const composioSlugs = new Set<string>();
  try {
    const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
    if (apiKey) {
      const composio = getComposio();
      const list = await composio.connectedAccounts.list({
        userIds: [userId],
        statuses: ["ACTIVE"],
        toolkitSlugs: [
          COMPOSIO_APPS.googlecalendar.slug,
          COMPOSIO_APPS.clickup.slug,
          COMPOSIO_APPS.instagram.slug,
          COMPOSIO_APPS.linkedin.slug,
        ],
      });
      const items = (list as { items?: Array<{ toolkit?: { slug?: string }; toolkitSlug?: string }> }).items ?? [];
      for (const item of items) {
        const slug = (item.toolkit?.slug ?? item.toolkitSlug ?? "").toLowerCase();
        if (slug) composioSlugs.add(slug);
      }
    }
  } catch (e) {
    console.warn('[ai-chat/stream] Failed to check Composio status:', e);
  }

  // Check each integration
  for (const key of Object.keys(AVAILABLE_INTEGRATIONS)) {
    const info = AVAILABLE_INTEGRATIONS[key];
    // Check if connected via DB integrations
    const isConnectedDB = connectedNames.some(n =>
      n === key.toLowerCase() ||
      n === info.name.toLowerCase() ||
      n.includes(key.toLowerCase())
    );
    // Check if connected via Composio
    const isConnectedComposio = info.composioApp
      ? composioSlugs.has(COMPOSIO_APPS[info.composioApp].slug.toLowerCase())
      : false;
    integrationStatus[key] = isConnectedDB || isConnectedComposio;
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
    const sessionCookie = getSessionCookie(cookieStore);

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

    // Load Composio tools for connected integrations (ClickUp, Google Calendar, etc.)
    let composioTools: import('ai').ToolSet = {};
    try {
      const session_tools = await getComposioSessionTools(session.user.id);
      composioTools = session_tools.tools;
    } catch (e) {
      console.warn('[ai-chat/stream] Failed to load Composio tools:', e);
      // Continue without tools - graceful degradation
    }

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
    const toolCallsMetadata: Array<{
      toolCallId: string;
      toolName: string;
      displayName: string;
      status: 'success' | 'error';
      summary: string;
    }> = [];

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const hasTools = Object.keys(composioTools).length > 0;
          const result = streamText({
            model: anthropic(claudeModel),
            system: systemPrompt,
            messages,
            tools: hasTools ? composioTools : undefined,
            stopWhen: hasTools ? stepCountIs(10) : stepCountIs(1),
            maxOutputTokens: isThinkingEnabled ? 16000 : 8000,
          });

          // Use fullStream to get ALL events including tool calls
          for await (const part of result.fullStream) {
            switch (part.type) {
              case 'text-delta': {
                fullResponse += part.text;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'text', content: part.text })}\n\n`)
                );
                break;
              }

              case 'tool-call': {
                const displayName = getToolDisplayName(part.toolName);
                // Send a short description of what args were passed
                let argsPreview = '';
                try {
                  const args = (part as any).args || (part as any).input;
                  if (args && typeof args === 'object') {
                    const entries = Object.entries(args).slice(0, 3);
                    argsPreview = entries
                      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v.slice(0, 60) : JSON.stringify(v)}`)
                      .join(', ');
                    if (argsPreview.length > 150) argsPreview = argsPreview.slice(0, 147) + '...';
                  }
                } catch {}
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'tool_call_start',
                    toolCallId: part.toolCallId,
                    toolName: part.toolName,
                    displayName,
                    args: argsPreview || undefined,
                  })}\n\n`)
                );
                break;
              }

              case 'tool-result': {
                const displayName = getToolDisplayName(part.toolName);
                const rawOutput = (part as any).output;
                const summary = summarizeToolResult(part.toolName, rawOutput);

                // Build a short result preview for the expanded card
                let resultPreview = '';
                try {
                  if (rawOutput != null) {
                    const outputStr = typeof rawOutput === 'string' ? rawOutput : JSON.stringify(rawOutput, null, 2);
                    resultPreview = outputStr.length > 500 ? outputStr.slice(0, 497) + '...' : outputStr;
                  }
                } catch {}

                toolCallsMetadata.push({
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  displayName,
                  status: 'success',
                  summary,
                });

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'tool_call_result',
                    toolCallId: part.toolCallId,
                    toolName: part.toolName,
                    displayName,
                    status: 'success',
                    summary,
                    resultPreview: resultPreview || undefined,
                  })}\n\n`)
                );
                break;
              }

              default:
                break;
            }
          }

          // Parse connect actions from the response for agentic UI
          const connectActions = parseConnectActions(fullResponse);
          let cleanedResponse = cleanResponseText(fullResponse);

          // If the AI used tools but produced no text, build a fallback response
          if (!cleanedResponse && toolCallsMetadata.length > 0) {
            const successfulTools = toolCallsMetadata.filter(tc => tc.status === 'success');
            const failedTools = toolCallsMetadata.filter(tc => tc.status === 'error');

            let fallback = 'I completed the following operations:\n\n';
            for (const tc of successfulTools) {
              fallback += `- **${tc.displayName}**: ${tc.summary}\n`;
            }
            if (failedTools.length > 0) {
              fallback += '\nSome operations failed:\n';
              for (const tc of failedTools) {
                fallback += `- **${tc.displayName}**: ${tc.summary}\n`;
              }
            }
            fallback += '\nPlease try asking again if you need more details — I may have run into a tool execution limit.';

            cleanedResponse = fallback;

            // Stream the fallback text to the client so they see it
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'text', content: cleanedResponse })}\n\n`)
            );
          }

          // Build metadata with connect actions and tool calls
          const messageMetadata: Record<string, any> = {
            thinking: isThinkingEnabled ? 'Extended thinking enabled' : undefined,
            toolCalls: toolCallsMetadata.length > 0 ? toolCallsMetadata : undefined,
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
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connect_action', connectActions })}\n\n`));
          }

          // Send done signal with tool call metadata for persistence
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            done: true,
            toolCalls: toolCallsMetadata.length > 0 ? toolCallsMetadata : undefined,
          })}\n\n`));
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

## Using Integration Tools

When a user asks about a **connected** integration (like ClickUp, Google Calendar, Instagram, or LinkedIn), you have tool access via Composio:
- Use COMPOSIO_SEARCH_TOOLS to discover available tools for a connected integration
- Use the discovered tools to take actions (view tasks, create events, etc.)
- If a tool call fails, let the user know and suggest they reconnect the integration

## Tool Execution Behavior — EFFICIENCY IS CRITICAL

You have a STRICT LIMIT of tool call rounds. Be extremely efficient:

1. **Search for tools ONCE per integration** — never call COMPOSIO_SEARCH_TOOLS for the same integration twice
2. **Batch operations** — if you need multiple pieces of data, call all the tools you need in the SAME step (parallel tool calls), don't call them one at a time
3. **Minimize steps** — aim for 2-3 tool rounds maximum: (1) search for tools, (2) execute the actions, (3) present results
4. **ALWAYS produce a text response** — after your tool calls finish, you MUST write a text summary/answer. Never end with just tool calls and no text.
5. **If a tool call fails, move on** — don't retry the same call. Use what data you have and tell the user what didn't work.

CRITICAL: JUST USE TOOLS SILENTLY. Do NOT narrate what you are about to do.

BAD examples (NEVER do this):
- "I'll fetch your tasks from ClickUp to give you an overview."
- "Let me look up your calendar events."
- "Now let me process this data to create a summary."
- "First, I'll search for the available tools..."

GOOD examples (DO this):
- [silently call tools, then present the results directly]
- "Here are your active tasks across 3 projects: ..."
- "You have 5 upcoming events this week: ..."

Rules:
- Do NOT say "Let me fetch...", "I'll look up...", "Now let me process...", "First, let me..."
- Call tools directly without announcing them
- If multiple tool calls are needed, make them all in ONE round without narrating each step
- Only speak to the user AFTER you have the data to present
- If a tool call fails, briefly mention it and suggest reconnecting
- NEVER search for the same tools twice — remember what tools are available after the first search

## Rich UI Formatting

When presenting structured data (lists of tasks, events, emails, meetings, posts), use component blocks for rich rendering in the chat UI. Wrap structured data in this format:

\`\`\`
:::component{type="TYPE_NAME"}
JSON_ARRAY_OR_OBJECT_HERE
:::
\`\`\`

Available component types and their JSON schemas:

### task_table
Use when presenting 2+ tasks. Each object in the JSON array:
{"name": "string", "status": "string", "priority": "string (HIGH/MEDIUM/LOW/URGENT/NONE)", "dueDate": "ISO date string or null", "assignee": "string or null", "project": "string or null"}

### calendar_events
Use when presenting 2+ calendar events. Each object:
{"title": "string", "start": "ISO datetime", "end": "ISO datetime", "location": "string or null", "attendees": ["string array"], "description": "string or null"}

### email_summary
Use when presenting 2+ emails. Each object:
{"from": "string", "subject": "string", "snippet": "string (first ~100 chars)", "date": "ISO datetime", "isUrgent": true/false}

### meeting_summary
Use for a meeting with insights. Object:
{"title": "string", "date": "ISO datetime", "duration": "number (minutes) or null", "participants": ["string array"], "summary": "string", "actionItems": [{"task": "string", "owner": "string or null"}], "keyTopics": ["string array"]}

### social_post
Use when presenting social media posts. Each object:
{"platform": "instagram|linkedin", "content": "string", "date": "ISO datetime", "likes": "number or null", "comments": "number or null"}

Rules for component blocks:
- Always include a brief text summary before or after the component block for context
- The JSON inside must be valid JSON (array for multiple items, object for single items)
- Do NOT wrap the same data as both text AND component — pick one
- Use component blocks when you have 2+ structured items to display

## Response Guidelines

1. When a user asks about a **connected** integration, USE YOUR TOOLS to fetch real data and take actions. Do not just describe capabilities - actually use the tools.

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

5. Present data using component blocks when you have structured results. Always add a brief text insight before or after the component.
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
