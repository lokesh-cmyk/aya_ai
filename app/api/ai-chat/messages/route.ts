import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateText, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { getComposioSessionTools, getAppDisplayName } from '@/lib/composio-tools';

// POST: Send a message and get AI response
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("better-auth.session_token");
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, message, model, files, pastedContent, isThinkingEnabled } = body;

    // Verify conversation belongs to user
    const conversation = await (prisma as any).aIChatConversation.findFirst({
      where: {
        id: conversationId,
        userId: session.user.id,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Save user message
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
      take: 20, // Last 20 messages for context
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
                        assignee: {
                          select: {
                            name: true,
                            email: true,
                          },
                        },
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

    // Get recent emails/messages
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
      include: {
        contact: true,
      },
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
        insights: {
          where: {
            type: { in: ['summary', 'action_items', 'key_topics'] },
          },
        },
        participants: {
          select: { name: true },
        },
      },
    });

    // Build AI context
    const context = {
      user: {
        name: user?.name,
        email: user?.email,
        team: user?.team?.name,
      },
      projects: user?.team?.spaces?.map(space => ({
        name: space.name,
        description: space.description,
        tasks: space.taskLists.flatMap(list => 
          list.tasks
            .filter(task => {
              // Filter out closed tasks unless they have upcoming due dates
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
        } catch {
          // Ignore parse errors
        }

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

    // Use Composio + Google Calendar tools when configured; otherwise Claude-only
    let aiResponse: { content: string; metadata?: Record<string, unknown> };
    if (process.env.NEXT_PUBLIC_COMPOSIO_API_KEY) {
      try {
        aiResponse = await generateAIResponseWithComposio({
          userId: session.user.id,
          message,
          history: history.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
          context,
          model: model || conversation.model,
          isThinkingEnabled,
        });
      } catch (composioError: any) {
        const errMsg = composioError?.message ?? String(composioError);
        console.warn('[ai-chat/messages] Composio flow failed, falling back to Claude-only:', errMsg);
        if (composioError?.statusCode != null) console.warn('[ai-chat/messages] API status:', composioError.statusCode);
        if (composioError?.responseBody) console.warn('[ai-chat/messages] API response:', composioError.responseBody);
        aiResponse = await generateAIResponse({
          message,
          history: history.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
          context,
          model: model || conversation.model,
          isThinkingEnabled,
        });
      }
    } else {
      aiResponse = await generateAIResponse({
        message,
        history: history.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
        context,
        model: model || conversation.model,
        isThinkingEnabled,
      });
    }

    // Save AI response
    const assistantMessage = await (prisma as any).aIChatMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: aiResponse.content,
        model: model || conversation.model,
        metadata: aiResponse.metadata || {},
      },
    });

    // Update conversation updatedAt
    await (prisma as any).aIChatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      userMessage,
      assistantMessage,
    });
  } catch (error: any) {
    console.error('[ai-chat/messages] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}

export type ConnectAction = { connectLink: string; connectAppName: string };

/** Extract connect link(s) from Composio COMPOSIO_MANAGE_CONNECTIONS tool results for Agentic UI */
function extractConnectActionsFromToolResults(
  toolResults: Array<{ toolName: string; result: unknown }>,
  getAppName: (toolkitSlug: string | undefined) => string
): ConnectAction[] {
  const actions: ConnectAction[] = [];
  const seenUrls = new Set<string>();
  for (const tr of toolResults) {
    if (!tr.toolName || !String(tr.toolName).includes('MANAGE_CONNECTIONS')) continue;
    const r = tr.result as Record<string, unknown> | string | null | undefined;
    if (!r) continue;
    let url: string | null = null;
    let toolkitSlug: string | undefined;
    if (typeof r === 'string') {
      const match = r.match(/https:\/\/connect\.composio\.dev\/[^\s"')\]]+/);
      if (match) url = match[0];
    } else {
      url =
        (r.redirect_url as string) ??
        (r.redirectUrl as string) ??
        (r.link as string) ??
        (r.connectLink as string) ??
        (r.connect_link as string) ??
        null;
      toolkitSlug = (r.toolkitSlug ?? r.toolkit ?? r.app) as string | undefined;
      if (!url) {
        const data = r.data as Record<string, unknown> | undefined;
        if (data) {
          url =
            (data.redirect_url as string) ??
            (data.redirectUrl as string) ??
            (data.link as string) ??
            null;
          if (!toolkitSlug) toolkitSlug = (data.toolkitSlug ?? data.toolkit) as string | undefined;
        }
      }
      if (!url) {
        const resultStr = typeof (r as any).result === 'string' ? (r as any).result : null;
        if (resultStr) {
          try {
            const parsed = JSON.parse(resultStr) as Record<string, unknown>;
            url = (parsed.redirect_url ?? parsed.redirectUrl ?? parsed.link) as string | null;
            if (!toolkitSlug) toolkitSlug = (parsed.toolkitSlug ?? parsed.toolkit) as string | undefined;
          } catch {
            const match = resultStr.match(/https:\/\/connect\.composio\.dev\/[^\s"')\]]+/);
            if (match) url = match[0];
          }
        }
      }
    }
    if (url && typeof url === 'string' && url.startsWith('http') && !seenUrls.has(url)) {
      seenUrls.add(url);
      actions.push({ connectLink: url, connectAppName: getAppName(toolkitSlug) });
    }
  }
  return actions;
}

// AI Response with Composio tools (Google Calendar + ClickUp, in-chat auth, Agentic UI)
async function generateAIResponseWithComposio({
  userId,
  message,
  history,
  context,
  model,
  isThinkingEnabled,
}: {
  userId: string;
  message: string;
  history: Array<{ role: string; content: string }>;
  context: any;
  model: string;
  isThinkingEnabled: boolean;
}): Promise<{ content: string; metadata: Record<string, unknown> }> {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    return {
      content: 'Error: Claude API key is not configured. Please set ANTHROPIC_API_KEY.',
      metadata: { model, error: 'missing_api_key' },
    };
  }

  const { tools, sessionId } = await getComposioSessionTools(userId);
  const modelMap: Record<string, string> = {
    'opus-4.5': 'claude-opus-4-5-20251101',
    'sonnet-4.5': 'claude-sonnet-4-5-20250929',
    'haiku-4.5': 'claude-haiku-4-5-20251001',
  };
  const claudeModel = modelMap[model] || modelMap['sonnet-4.5'];

  const systemPrompt = `You are an AI assistant named AYA, helping with project management, email insights, meetings, Google Calendar, ClickUp, Instagram, and LinkedIn.

You have access to:
- **Meetings**: Recent meeting recordings with AI-generated summaries, action items, key topics, and participant information. Use this to help users recall discussions, track follow-ups, and plan based on meeting outcomes.
- Google Calendar: list events, create events. Use COMPOSIO_SEARCH_TOOLS to find calendar tools. If the user has not connected Google Calendar, use COMPOSIO_MANAGE_CONNECTIONS to get a connect link.
- ClickUp: tasks, spaces, lists. Use COMPOSIO_SEARCH_TOOLS to find ClickUp tools. If the user has not connected ClickUp, use COMPOSIO_MANAGE_CONNECTIONS to get a connect link.
- Instagram: DMs, insights, content. Use COMPOSIO_SEARCH_TOOLS to find Instagram tools. If the user has not connected Instagram, use COMPOSIO_MANAGE_CONNECTIONS to get a connect link.
- LinkedIn: create/delete posts, create comments on posts (LINKEDIN_CREATE_COMMENT_ON_POST), get images (LINKEDIN_GET_IMAGES), get video (LINKEDIN_GET_VIDEO), get videos list (LINKEDIN_GET_VIDEOS), and register image upload for posts (LINKEDIN_REGISTER_IMAGE_UPLOAD). For image posts: first call LINKEDIN_REGISTER_IMAGE_UPLOAD to get upload_url and asset_urn, then upload the image bytes to upload_url, then use the asset_urn in LINKEDIN_CREATE_LINKED_IN_POST. Use COMPOSIO_SEARCH_TOOLS to find LinkedIn tools. If the user has not connected LinkedIn, use COMPOSIO_MANAGE_CONNECTIONS to get a connect link.

When the user asks to connect an app (e.g. "connect my calendar", "connect ClickUp", "connect Instagram", "connect LinkedIn"), call COMPOSIO_MANAGE_CONNECTIONS so they get a link to authorize. Tell them to use the Connect button in the chat.

When the user asks about meetings, use the provided meeting context to:
- Summarize recent meetings
- List action items and follow-ups from meetings
- Find discussions about specific topics
- Identify who was involved in discussions
- Help plan based on meeting outcomes

Context:
- User: ${context.user.name} (${context.user.email})
- Team: ${context.user.team || 'No team'}
- Projects: ${context.projects.length}; Recent emails: ${context.recentEmails.length}; Recent meetings: ${context.meetings?.length || 0}

${context.meetings?.length > 0 ? `\nRecent Meetings:\n${context.meetings.map((m: any) => {
  let info = `- ${m.title} (${new Date(m.date).toLocaleDateString()})`;
  if (m.participants?.length > 0) info += ` - Participants: ${m.participants.join(', ')}`;
  if (m.summary) info += `\n  Summary: ${m.summary.substring(0, 200)}...`;
  if (m.actionItems?.length > 0) info += `\n  Action Items: ${m.actionItems.map((a: any) => a.task).join('; ')}`;
  if (m.keyTopics?.length > 0) info += `\n  Key Topics: ${m.keyTopics.join(', ')}`;
  return info;
}).join('\n')}` : ''}`;

  const messages = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  messages.push({ role: 'user' as const, content: message });

  let connectActions: ConnectAction[] = [];
  const collectedToolResults: Array<{ toolName: string; result: unknown }> = [];

  const result = await generateText({
    model: anthropic(claudeModel),
    system: systemPrompt,
    messages,
    tools,
    stopWhen: stepCountIs(10),
    onStepFinish: (stepResult) => {
      const toolResults = stepResult.toolResults ?? [];
      if (toolResults.length) {
        for (const tr of toolResults) {
          const out = (tr as any).output ?? (tr as any).result;
          collectedToolResults.push({ toolName: (tr as any).toolName, result: out });
        }
        connectActions = extractConnectActionsFromToolResults(collectedToolResults, getAppDisplayName);
      }
    },
  });

  const steps = (result as any).steps as Array<{ toolResults?: Array<{ toolName?: string; output?: unknown; result?: unknown }> }> | undefined;
  if (steps?.length && connectActions.length === 0) {
    for (const step of steps) {
      for (const tr of step.toolResults ?? []) {
        const out = tr?.output ?? tr?.result;
        if (tr?.toolName && out !== undefined) collectedToolResults.push({ toolName: tr.toolName, result: out });
      }
    }
  }
  if (connectActions.length === 0) connectActions = extractConnectActionsFromToolResults(collectedToolResults, getAppDisplayName);

  const metadata: Record<string, unknown> = {
    model: claudeModel,
    composioSessionId: sessionId,
    thinking: isThinkingEnabled ? 'Extended thinking enabled' : undefined,
  };
  if (connectActions.length > 0) {
    metadata.connectActions = connectActions;
    metadata.connectLink = connectActions[0].connectLink;
    metadata.connectAppName = connectActions[0].connectAppName;
  }

  return {
    content: result.text || 'I couldn\'t generate a response. Please try again.',
    metadata,
  };
}

// AI Response Generator using Claude API (no tools)
async function generateAIResponse({
  message,
  history,
  context,
  model,
  isThinkingEnabled,
}: {
  message: string;
  history: Array<{ role: string; content: string }>;
  context: any;
  model: string;
  isThinkingEnabled: boolean;
}) {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!anthropicApiKey) {
    console.error('[ai-chat] ANTHROPIC_API_KEY is not set');
    return {
      content: 'Error: Claude API key is not configured. Please set ANTHROPIC_API_KEY in your environment variables.',
      metadata: { model, error: 'missing_api_key' },
    };
  }

  try {
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    // Map model names to Claude model IDs
    const modelMap: Record<string, string> = {
      'opus-4.5': 'claude-opus-4-5-20251101',
      'sonnet-4.5': 'claude-sonnet-4-5-20250929',
      'haiku-4.5': 'claude-haiku-4-5-20251001',
    };

    const claudeModel = modelMap[model] || modelMap['sonnet-4.5'];

    // Build system prompt with context
    const systemPrompt = `You are an AI assistant named AYA, helping with project management, email insights, meetings, and calendar coordination. You have access to:
- User's ongoing projects and tasks
- Recent emails and messages
- Recent meetings with AI-generated summaries, action items, and key topics
- Team information

Provide helpful, concise responses. If asked about projects, emails, meetings, or calendar, use the provided context to give specific insights.

When the user asks about meetings, use the provided meeting context to:
- Summarize recent meetings
- List action items and follow-ups from meetings
- Find discussions about specific topics
- Identify who was involved in discussions
- Help plan based on meeting outcomes

Context:
- User: ${context.user.name} (${context.user.email})
- Team: ${context.user.team || 'No team'}
- Active Projects: ${context.projects.length}
- Recent Emails: ${context.recentEmails.length}
- Recent Meetings: ${context.meetings?.length || 0}

${context.projects.length > 0 ? `\nProjects:\n${context.projects.map((p: any) => `- ${p.name}: ${p.tasks.length} tasks`).join('\n')}` : ''}

${context.recentEmails.length > 0 ? `\nRecent Emails:\n${context.recentEmails.map((e: any) => `- From ${e.from}: ${e.subject}`).join('\n')}` : ''}

${context.meetings?.length > 0 ? `\nRecent Meetings:\n${context.meetings.map((m: any) => {
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
}).join('\n')}` : ''}`;

    // Convert history to Claude message format
    const messages = history.map((h) => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content,
    }));

    // Add current user message
    messages.push({
      role: 'user',
      content: message,
    });

    // Call Claude API
    const response = await anthropic.messages.create({
      model: claudeModel,
      max_tokens: isThinkingEnabled ? 4096 : 2048,
      system: systemPrompt,
      messages: messages as any,
    });

    // Extract text content from response
    const content = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    return {
      content: content || 'I apologize, but I couldn\'t generate a response. Please try again.',
      metadata: {
        model: claudeModel,
        thinking: isThinkingEnabled ? 'Extended thinking enabled' : undefined,
        usage: response.usage,
      },
    };
  } catch (error: any) {
    console.error('[ai-chat] Claude API error:', error);
    return {
      content: `I encountered an error: ${error.message || 'Failed to generate response'}. Please try again.`,
      metadata: {
        model,
        error: error.message,
      },
    };
  }
}
