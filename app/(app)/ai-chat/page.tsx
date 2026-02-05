"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { ClaudeChatInput } from "@/components/ui/claude-style-chat-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Trash2, MessageSquare, Loader2, Sparkles, Menu, X, ChevronDown } from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisMonth, startOfDay, subDays } from "date-fns";
import { MessageBubble, TypingIndicator, StopGenerationButton } from "@/components/ai-chat";
import { useStreamingChat } from "@/hooks/useStreamingChat";

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

interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  thisWeek: Conversation[];
  thisMonth: Conversation[];
  older: Conversation[];
}

function groupConversationsByDate(conversations: Conversation[]): GroupedConversations {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = subDays(today, 1);

  return {
    today: conversations.filter(c => isToday(new Date(c.updatedAt))),
    yesterday: conversations.filter(c => isYesterday(new Date(c.updatedAt))),
    thisWeek: conversations.filter(c => {
      const date = new Date(c.updatedAt);
      return isThisWeek(date) && !isToday(date) && !isYesterday(date);
    }),
    thisMonth: conversations.filter(c => {
      const date = new Date(c.updatedAt);
      return isThisMonth(date) && !isThisWeek(date);
    }),
    older: conversations.filter(c => {
      const date = new Date(c.updatedAt);
      return !isThisMonth(date);
    }),
  };
}

interface ConversationGroupProps {
  title: string;
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function ConversationGroup({
  title,
  conversations,
  selectedId,
  onSelect,
  onDelete,
}: ConversationGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (conversations.length === 0) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-1 w-full px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
      >
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform duration-200",
            isCollapsed && "-rotate-90"
          )}
        />
        {title}
        <span className="text-gray-400 font-normal">({conversations.length})</span>
      </button>
      {!isCollapsed && (
        <div className="space-y-1 mt-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "w-full text-left p-3 rounded-xl transition-all group relative",
                selectedId === conv.id
                  ? "bg-blue-50 border border-blue-200"
                  : "hover:bg-gray-50 border border-transparent"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {conv.title || "New Conversation"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AIChatPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Streaming hook
  const {
    streamedText,
    isStreaming,
    isWaitingForResponse,
    error: streamError,
    connectActions: streamConnectActions,
    startStream,
    stopStream,
    reset: resetStream,
  } = useStreamingChat();

  // Fetch conversations
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ["ai-chat-conversations", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/ai-chat/conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    enabled: !!session?.user?.id,
  });

  const conversations: Conversation[] = conversationsData?.conversations || [];
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const groupedConversations = useMemo(
    () => isMounted ? groupConversationsByDate(conversations) : { today: [], yesterday: [], thisWeek: [], thisMonth: [], older: [] },
    [conversations, isMounted]
  );

  // Fetch selected conversation
  const { data: conversationData, isLoading: conversationLoading } = useQuery({
    queryKey: ["ai-chat-conversation", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null;
      const res = await fetch(`/api/ai-chat/conversations/${selectedConversationId}`);
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return res.json();
    },
    enabled: !!selectedConversationId,
  });

  const currentConversation: Conversation | null = conversationData?.conversation || null;

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai-chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Conversation", model: "sonnet-4.5" }),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ai-chat-conversations"] });
      setSelectedConversationId(data.conversation.id);
      setIsCreating(false);
      setSidebarOpen(false);
    },
  });

  // Delete conversation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await fetch(`/api/ai-chat/conversations/${conversationId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete conversation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-chat-conversations"] });
      if (selectedConversationId) {
        setSelectedConversationId(null);
      }
    },
  });

  // Scroll to bottom when messages change or during streaming
  useEffect(() => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    }
  }, [currentConversation?.messages, streamedText, isStreaming, isWaitingForResponse, pendingUserMessage]);

  const handleSendMessage = useCallback(async (data: {
    message: string;
    files: any[];
    pastedContent: any[];
    model: string;
    isThinkingEnabled: boolean;
  }) => {
    // Show user message immediately (optimistic update)
    setPendingUserMessage(data.message);

    let convId = selectedConversationId;

    // Create conversation if needed
    if (!convId) {
      const convRes = await fetch("/api/ai-chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.message.substring(0, 50), model: data.model }),
      });
      const convData = await convRes.json();
      convId = convData.conversation.id;
      setSelectedConversationId(convId);
    }

    // Reset stream state
    resetStream();

    // Start streaming
    await startStream({
      conversationId: convId!,
      message: data.message,
      model: data.model,
      files: data.files,
      pastedContent: data.pastedContent,
      isThinkingEnabled: data.isThinkingEnabled,
    });

    // Clear pending message and refresh conversation data after streaming completes
    setPendingUserMessage(null);
    queryClient.invalidateQueries({ queryKey: ["ai-chat-conversation", convId] });
    queryClient.invalidateQueries({ queryKey: ["ai-chat-conversations"] });
  }, [selectedConversationId, startStream, resetStream, queryClient]);

  const handleStopGeneration = useCallback(() => {
    stopStream();
  }, [stopStream]);

  const handleNewChat = () => {
    setIsCreating(true);
    createConversationMutation.mutate();
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setSidebarOpen(false);
    resetStream();
  };

  const greeting = useMemo(() => {
    if (!isMounted) return "Hello";
    const currentHour = new Date().getHours();
    if (currentHour >= 12 && currentHour < 18) {
      return "Good afternoon";
    } else if (currentHour >= 18) {
      return "Good evening";
    }
    return "Good morning";
  }, [isMounted]);

  const userInitial = session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "U";
  const isProcessing = isStreaming || isWaitingForResponse;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#fcfcf9]">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Chat History Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">AI Chat</h2>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <Button
            onClick={handleNewChat}
            className="w-full"
            disabled={isCreating || createConversationMutation.isPending}
          >
            {isCreating || createConversationMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            New Chat
          </Button>
        </div>

        {/* Conversations List - Grouped by Date */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 custom-scrollbar">
          {conversationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500 px-4">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            <>
              <ConversationGroup
                title="Today"
                conversations={groupedConversations.today}
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
                onDelete={(id) => deleteConversationMutation.mutate(id)}
              />
              <ConversationGroup
                title="Yesterday"
                conversations={groupedConversations.yesterday}
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
                onDelete={(id) => deleteConversationMutation.mutate(id)}
              />
              <ConversationGroup
                title="This Week"
                conversations={groupedConversations.thisWeek}
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
                onDelete={(id) => deleteConversationMutation.mutate(id)}
              />
              <ConversationGroup
                title="This Month"
                conversations={groupedConversations.thisMonth}
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
                onDelete={(id) => deleteConversationMutation.mutate(id)}
              />
              <ConversationGroup
                title="Older"
                conversations={groupedConversations.older}
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
                onDelete={(id) => deleteConversationMutation.mutate(id)}
              />
            </>
          )}
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {session?.user?.name || "User"}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {session?.user?.email}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Hamburger Menu Button - Top Right */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 right-4 z-30 lg:hidden p-2.5 bg-white hover:bg-gray-50 rounded-lg shadow-md border border-gray-200 transition-all hover:shadow-lg"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>

        {!selectedConversationId && !conversationLoading ? (
          /* Welcome Screen - Input at bottom, content centered above */
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 flex items-center justify-center">
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-light text-gray-900 mb-3 tracking-tight text-center">
                {greeting},{" "}
                <span className="relative inline-block pb-2">
                  {session?.user?.name || "there"}
                  <svg
                    className="absolute w-[140%] h-[20px] -bottom-1 -left-[5%] text-[#D97757]"
                    viewBox="0 0 140 24"
                    fill="none"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M6 16 Q 70 24, 134 14"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </span>
              </h1>
              <p className="text-gray-600 mb-6 text-center max-w-md text-sm sm:text-base px-4">
                I can help you with insights about your projects, important emails, and calendar appointments.
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl px-4">
                <button
                  onClick={() => handleSendMessage({
                    message: "Summarize my current projects. Give me an overview of their status, deadlines, and any action items I need to address.",
                    files: [],
                    pastedContent: [],
                    model: "sonnet-4.5",
                    isThinkingEnabled: false
                  })}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm text-gray-700 bg-transparent border border-gray-300 rounded-full hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Summarize projects
                </button>
                <button
                  onClick={() => handleSendMessage({
                    message: "Check my recent emails and give me a summary of important messages. Highlight any urgent items that need my attention.",
                    files: [],
                    pastedContent: [],
                    model: "sonnet-4.5",
                    isThinkingEnabled: false
                  })}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm text-gray-700 bg-transparent border border-gray-300 rounded-full hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  Check emails
                </button>
                <button
                  onClick={() => handleSendMessage({
                    message: "Give me insights about my calendar. What meetings do I have coming up? Are there any scheduling conflicts or busy periods I should be aware of?",
                    files: [],
                    pastedContent: [],
                    model: "sonnet-4.5",
                    isThinkingEnabled: false
                  })}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm text-gray-700 bg-transparent border border-gray-300 rounded-full hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Calendar insights
                </button>
              </div>
            </div>
            {/* Input Area - Fixed at bottom */}
            <div className="shrink-0 px-4 pb-6 sm:px-6">
              <ClaudeChatInput
                onSendMessage={handleSendMessage}
                disabled={isProcessing}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Messages Area - Scrollable */}
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="max-w-3xl mx-auto space-y-6 pb-4">
                {conversationLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : currentConversation?.messages.length === 0 && !isProcessing && !pendingUserMessage ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Start the conversation below</p>
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

                    {/* Pending User Message (Optimistic Update) */}
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

                    {/* Waiting for Response (Typing Indicator) */}
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
                          metadata: streamConnectActions.length > 0 ? { connectActions: streamConnectActions } : undefined,
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
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-gray-900 font-medium text-sm mb-1">Oops! Something went wrong</p>
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
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Stop Generation Button */}
            {isProcessing && (
              <div className="flex justify-center pb-2">
                <StopGenerationButton onStop={handleStopGeneration} />
              </div>
            )}

            {/* Input Area */}
            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              <ClaudeChatInput
                onSendMessage={handleSendMessage}
                disabled={isProcessing}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
