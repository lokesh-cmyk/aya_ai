"use client";

import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  metadata?: any;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  userAvatar?: string;
}

export function ChatMessages({
  messages,
  isLoading,
  userAvatar,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">Start the conversation below</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6 pb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-4 items-start",
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                message.role === "assistant"
                  ? "bg-gradient-to-br from-indigo-500 to-purple-500"
                  : "bg-gradient-to-br from-blue-500 to-cyan-500"
              )}
            >
              {message.role === "assistant" ? (
                <Sparkles className="w-5 h-5 text-white" />
              ) : userAvatar ? (
                <span className="text-white font-semibold text-sm">
                  {userAvatar}
                </span>
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>

            {/* Message Content */}
            <div
              className={cn(
                "flex-1 max-w-[85%] sm:max-w-[75%]",
                message.role === "user" ? "text-right" : "text-left"
              )}
            >
              <div
                className={cn(
                  "inline-block rounded-2xl px-5 py-3 shadow-sm",
                  message.role === "user"
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white"
                    : "bg-white border border-gray-200 text-gray-900"
                )}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-a:text-indigo-600 prose-code:text-purple-600 prose-code:bg-purple-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                    {message.content}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}