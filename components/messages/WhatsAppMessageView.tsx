"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInfo {
  id: string;
  chatId: string;
  content: string;
  timestamp: number;
  fromMe: boolean;
  senderName?: string;
  type: "text" | "image" | "video" | "audio" | "document" | "sticker" | "other";
  mimetype?: string;
  filename?: string;
  caption?: string;
  quotedMessage?: {
    id: string;
    content: string;
  };
}

interface WhatsAppMessageViewProps {
  sessionId: string;
  chatId: string;
  chatName: string;
}

export function WhatsAppMessageView({
  sessionId,
  chatId,
  chatName,
}: WhatsAppMessageViewProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp-messages", sessionId, chatId],
    queryFn: async () => {
      const res = await fetch(
        `/api/integrations/whatsapp-inbox/sessions/${sessionId}/messages?chatId=${encodeURIComponent(chatId)}`
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json() as Promise<{ messages: MessageInfo[] }>;
    },
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const messages = data?.messages || [];

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No messages yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 overflow-y-auto h-full">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
            msg.fromMe
              ? "ml-auto bg-green-500 text-white rounded-br-sm"
              : "mr-auto bg-gray-100 text-gray-900 rounded-bl-sm"
          )}
        >
          {/* Quoted message */}
          {msg.quotedMessage && (
            <div
              className={cn(
                "text-xs px-2 py-1 rounded mb-1.5 border-l-2",
                msg.fromMe
                  ? "bg-green-600/30 border-white/50"
                  : "bg-gray-200 border-gray-400"
              )}
            >
              {msg.quotedMessage.content}
            </div>
          )}

          {/* Message content by type */}
          {msg.type === "text" && <p className="whitespace-pre-wrap">{msg.content}</p>}

          {msg.type === "image" && (
            <div>
              <div className="bg-gray-200 rounded-lg w-48 h-32 flex items-center justify-center text-gray-400 text-xs mb-1">
                [Image]
              </div>
              {msg.caption && <p className="text-xs mt-1">{msg.caption}</p>}
            </div>
          )}

          {msg.type === "audio" && (
            <div className="flex items-center gap-2">
              <span className="text-lg">🎤</span>
              <span className="text-xs">Voice message</span>
            </div>
          )}

          {msg.type === "video" && (
            <div>
              <div className="bg-gray-200 rounded-lg w-48 h-32 flex items-center justify-center text-gray-400 text-xs mb-1">
                [Video]
              </div>
              {msg.caption && <p className="text-xs mt-1">{msg.caption}</p>}
            </div>
          )}

          {msg.type === "document" && (
            <div className="flex items-center gap-2">
              <span className="text-lg">📄</span>
              <span className="text-xs">{msg.filename || "Document"}</span>
            </div>
          )}

          {msg.type === "sticker" && (
            <span className="text-2xl">🏷️</span>
          )}

          {msg.type === "other" && (
            <p className="text-xs italic">{msg.content}</p>
          )}

          {/* Timestamp */}
          <p
            className={cn(
              "text-[10px] mt-1",
              msg.fromMe ? "text-green-200" : "text-gray-400"
            )}
          >
            {new Date(msg.timestamp * 1000).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      ))}
    </div>
  );
}
