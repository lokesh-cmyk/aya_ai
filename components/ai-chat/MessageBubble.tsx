"use client";

import React, { memo } from 'react';
import { Sparkles, Calendar, ListTodo, ExternalLink, Instagram, Linkedin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MessageActions } from './MessageActions';
import { StreamingMessage } from './StreamingMessage';
import { ToolCallCard } from './ToolCallCard';
import { GenerativeUIRenderer } from './GenerativeUIRenderer';

interface ToolCallData {
  toolCallId: string;
  toolName: string;
  displayName: string;
  status: 'calling' | 'success' | 'error';
  summary?: string;
  args?: string;
  resultPreview?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  metadata?: any;
}

interface MessageBubbleProps {
  message: Message;
  userInitial: string;
  isStreaming?: boolean;
  streamedContent?: string;
  toolCalls?: ToolCallData[];
  onRegenerate?: () => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  userInitial,
  isStreaming = false,
  streamedContent,
  toolCalls,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const displayContent = isStreaming ? streamedContent || '' : message.content;

  // Extract connect actions for Agentic UI
  const connectActions = Array.isArray(message.metadata?.connectActions)
    ? message.metadata.connectActions as Array<{ connectLink: string; connectAppName: string }>
    : message.metadata?.connectLink
      ? [{ connectLink: String(message.metadata.connectLink), connectAppName: String(message.metadata?.connectAppName ?? "App") }]
      : [];

  // Tool calls: use live streaming tool calls if available, otherwise from saved metadata
  const displayToolCalls: ToolCallData[] = toolCalls && toolCalls.length > 0
    ? toolCalls
    : (message.metadata?.toolCalls || []);

  return (
    <div
      className={cn(
        'flex gap-3 sm:gap-4 animate-message-slide-in group',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Message Content */}
      <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-[80%]">
        {/* Tool Call Cards — rendered above the message bubble */}
        {!isUser && displayToolCalls.length > 0 && (
          <div className="space-y-1.5 mb-1">
            {displayToolCalls.map((tc) => (
              <ToolCallCard
                key={tc.toolCallId}
                toolName={tc.toolName}
                displayName={tc.displayName}
                status={tc.status}
                summary={tc.summary}
                args={tc.args}
                resultPreview={tc.resultPreview}
              />
            ))}
          </div>
        )}

        <div
          className={cn(
            'rounded-2xl px-4 py-3 shadow-sm',
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-900'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-white text-sm sm:text-base leading-relaxed">
              {message.content}
            </p>
          ) : (
            <div className="space-y-3">
              {isStreaming ? (
                <StreamingMessage content={displayContent} isStreaming={isStreaming} />
              ) : (
                <GenerativeUIRenderer content={displayContent} />
              )}

              {/* Agentic UI: Connect apps */}
              {connectActions.length > 0 && !isStreaming && (
                <div className="mt-3 pt-3 border-t border-gray-200/80 space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Connect your apps
                  </p>
                  <div className="flex flex-col gap-2">
                    {connectActions.map((action, i) => {
                      const isCalendar = /calendar|google/i.test(action.connectAppName);
                      const isClickUp = /clickup/i.test(action.connectAppName);
                      const isInstagram = /instagram/i.test(action.connectAppName);
                      const isLinkedIn = /linkedin/i.test(action.connectAppName);

                      return (
                        <div
                          key={i}
                          className="rounded-xl border border-gray-200/90 bg-gradient-to-br from-white to-gray-50/80 p-3 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm hover:shadow transition-shadow"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className={cn(
                                'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                                isClickUp
                                  ? 'bg-[#7B68EE]/10 text-[#7B68EE]'
                                  : isInstagram
                                    ? 'bg-pink-500/10 text-pink-600'
                                    : isLinkedIn
                                      ? 'bg-[#0A66C2]/10 text-[#0A66C2]'
                                      : 'bg-blue-500/10 text-blue-600'
                              )}
                            >
                              {isClickUp ? (
                                <ListTodo className="w-5 h-5" strokeWidth={2} />
                              ) : isInstagram ? (
                                <Instagram className="w-5 h-5" strokeWidth={2} />
                              ) : isLinkedIn ? (
                                <Linkedin className="w-5 h-5" strokeWidth={2} />
                              ) : (
                                <Calendar className="w-5 h-5" strokeWidth={2} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {action.connectAppName}
                              </p>
                              <p className="text-xs text-gray-500">
                                Authorize to use in chat
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              asChild
                              size="sm"
                              className="rounded-lg bg-black text-white hover:bg-black/90 shadow-sm font-medium"
                            >
                              <a
                                href={action.connectLink}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                Connect
                              </a>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Actions */}
        {!isUser && !isStreaming && (
          <MessageActions
            content={message.content}
            onRegenerate={onRegenerate}
            showRegenerate={!!onRegenerate}
            className="ml-1"
          />
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm shadow-md">
          {userInitial}
        </div>
      )}
    </div>
  );
});

export default MessageBubble;
