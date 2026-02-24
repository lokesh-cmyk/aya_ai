"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { MessageBubble, TypingIndicator } from "@/components/ai-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, X, Send, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  metadata?: any;
}

interface Conversation {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

interface AyaChatInterfaceProps {
  onClose: () => void;
}

export function AyaChatInterface({ onClose }: AyaChatInterfaceProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Streaming hook
  const {
    streamedText,
    isStreaming,
    isWaitingForResponse,
    error: streamError,
    startStream,
    stopStream,
    reset: resetStream,
  } = useStreamingChat();

  // Fetch or create AYA conversation
  const { data: conversationData, isLoading: conversationLoading } = useQuery({
    queryKey: ["aya-chat-conversation", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const res = await fetch(`/api/ai-chat/conversations/${conversationId}`);
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return res.json();
    },
    enabled: !!conversationId,
  });

  const currentConversation: Conversation | null = conversationData?.conversation || null;

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai-chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "AYA Chat",
          model: "sonnet-4.6",
        }),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      return res.json();
    },
    onSuccess: (data) => {
      setConversationId(data.conversation.id);
    },
  });

  // Create conversation on mount if needed
  useEffect(() => {
    if (!conversationId && !createConversationMutation.isPending) {
      createConversationMutation.mutate();
    }
  }, [conversationId, createConversationMutation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    }
  }, [currentConversation?.messages, streamedText, isStreaming, isWaitingForResponse, pendingUserMessage]);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !conversationId) return;

    const text = messageText.trim();
    setMessageText("");
    setPendingUserMessage(text);

    // Reset stream state
    resetStream();

    // Start streaming
    await startStream({
      conversationId,
      message: text,
      model: "sonnet-4.6",
      files: [],
      pastedContent: [],
      isThinkingEnabled: false,
    });

    // Clear pending message and refresh conversation
    setPendingUserMessage(null);
    queryClient.invalidateQueries({ queryKey: ["aya-chat-conversation", conversationId] });
  }, [messageText, conversationId, startStream, resetStream, queryClient]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const userInitial = session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "U";
  const isProcessing = isStreaming || isWaitingForResponse;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AYA AI</h2>
              <p className="text-xs text-gray-500">Your AI Assistant</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {conversationLoading || createConversationMutation.isPending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : currentConversation?.messages.length === 0 && !isProcessing && !pendingUserMessage ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Hi! I'm AYA
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                I can help you with insights about your projects, emails, meetings, and more. How can I assist you today?
              </p>
            </div>
          ) : (
            <>
              {/* Existing Messages */}
              {currentConversation?.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  userInitial={userInitial}
                />
              ))}

              {/* Pending User Message */}
              {pendingUserMessage && (
                <MessageBubble
                  message={{
                    id: "pending-user",
                    role: "user",
                    content: pendingUserMessage,
                    createdAt: new Date().toISOString(),
                  }}
                  userInitial={userInitial}
                />
              )}

              {/* Waiting for Response */}
              {isWaitingForResponse && (
                <div className="flex gap-3 sm:gap-4 justify-start animate-message-slide-in">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                    <TypingIndicator />
                  </div>
                </div>
              )}

              {/* Streaming Message */}
              {isStreaming && streamedText && (
                <MessageBubble
                  message={{
                    id: "streaming",
                    role: "assistant",
                    content: streamedText,
                    createdAt: new Date().toISOString(),
                  }}
                  userInitial={userInitial}
                  isStreaming={true}
                  streamedContent={streamedText}
                />
              )}

              {/* Stream Error */}
              {streamError && (
                <div className="flex gap-3 sm:gap-4 justify-start animate-message-slide-in">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-red-200 rounded-2xl px-4 py-3 shadow-sm max-w-md">
                    <p className="text-gray-900 font-medium text-sm mb-1">
                      Something went wrong
                    </p>
                    <p className="text-gray-600 text-sm">
                      {streamError.message || "Please try again."}
                    </p>
                    <button
                      onClick={() => resetStream()}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Stop Button */}
      {isProcessing && (
        <div className="flex justify-center pb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={stopStream}
            className="rounded-full"
          >
            Stop generating
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AYA anything..."
              disabled={isProcessing || !conversationId}
              className="rounded-full pr-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || isProcessing || !conversationId}
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
