"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppSession {
  id: string;
  slot: number;
  phone: string | null;
  displayName: string | null;
  status: string;
}

interface ChatItem {
  id: string;
  name: string;
  phone: string;
  lastMessage?: {
    content: string;
    timestamp: number;
    fromMe: boolean;
  };
  unreadCount: number;
  isGroup: boolean;
  sessionId: string;
  sessionPhone: string | null;
}

interface WhatsAppChatListProps {
  sessions: WhatsAppSession[];
  selectedChatId: string | null;
  selectedSessionId: string | null;
  onSelectChat: (chatId: string, sessionId: string) => void;
}

export function WhatsAppChatList({
  sessions,
  selectedChatId,
  selectedSessionId,
  onSelectChat,
}: WhatsAppChatListProps) {
  const connectedSessions = sessions.filter((s) => s.status === "connected");

  // Fetch chats from all connected sessions
  const { data: allChats, isLoading } = useQuery({
    queryKey: ["whatsapp-chats", connectedSessions.map((s) => s.id).join(",")],
    queryFn: async () => {
      const results: ChatItem[] = [];
      for (const session of connectedSessions) {
        try {
          const res = await fetch(
            `/api/integrations/whatsapp-inbox/sessions/${session.id}/chats`
          );
          if (res.ok) {
            const data = await res.json();
            for (const chat of data.chats || []) {
              results.push({
                ...chat,
                sessionId: session.id,
                sessionPhone: session.phone,
              });
            }
          }
        } catch {
          // Skip failed sessions
        }
      }
      // Sort by last message timestamp (most recent first)
      return results.sort(
        (a, b) =>
          (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0)
      );
    },
    enabled: connectedSessions.length > 0,
    refetchInterval: 30000,
  });

  if (connectedSessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 font-medium">No WhatsApp numbers connected</p>
        <p className="text-xs text-gray-400 mt-1">
          Go to Settings &gt; Integrations to connect your WhatsApp
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!allChats || allChats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 font-medium">No chats yet</p>
        <p className="text-xs text-gray-400 mt-1">
          New messages will appear here as they arrive
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {allChats.map((chat) => {
        const isSelected =
          chat.id === selectedChatId && chat.sessionId === selectedSessionId;

        return (
          <button
            key={`${chat.sessionId}-${chat.id}`}
            onClick={() => onSelectChat(chat.id, chat.sessionId)}
            className={cn(
              "w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors",
              isSelected && "bg-blue-50 hover:bg-blue-50"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-medium text-green-700">
                {(chat.name || chat.phone || "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {chat.name || chat.phone}
                </p>
                {chat.lastMessage && (
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(chat.lastMessage.timestamp * 1000).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" }
                    )}
                  </span>
                )}
              </div>
              {chat.lastMessage && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {chat.lastMessage.fromMe ? "You: " : ""}
                  {chat.lastMessage.content}
                </p>
              )}
              {connectedSessions.length > 1 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  via {chat.sessionPhone}
                </p>
              )}
            </div>
            {chat.unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs font-medium shrink-0">
                {chat.unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
