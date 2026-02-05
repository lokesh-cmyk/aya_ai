"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  MessageSquare,
  Loader2,
  X,
  MoreVertical,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Conversation {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messages: any[];
}

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  isLoading: boolean;
  isCreating: boolean;
  sidebarOpen: boolean;
  userName?: string;
  userEmail?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onCloseSidebar: () => void;
}

export function ChatSidebar({
  conversations,
  selectedConversationId,
  isLoading,
  isCreating,
  sidebarOpen,
  userName,
  userEmail,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onCloseSidebar,
}: ChatSidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onCloseSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out h-screen",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-sm">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">AI Chat</h2>
              <p className="text-xs text-gray-500">Powered by Claude</p>
            </div>
          </div>
          <button
            onClick={onCloseSidebar}
            className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 flex-shrink-0">
          <Button
            onClick={onNewChat}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-sm"
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            New Chat
          </Button>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 pb-4">
            <div className="flex items-center gap-2 px-3 py-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recent
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  No conversations yet
                </p>
                <p className="text-xs text-gray-500">
                  Start a new chat to begin
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onCloseSidebar();
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-all group relative",
                    selectedConversationId === conv.id
                      ? "bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 shadow-sm"
                      : "hover:bg-gray-50 border border-transparent"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate mb-1">
                        {conv.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(conv.updatedAt), {
                            addSuffix: true,
                          })}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {conv.messages?.length || 0} messages
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conv.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm">
              {userName?.charAt(0) || userEmail?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {userName || "User"}
              </div>
              <div className="text-xs text-gray-500 truncate">{userEmail}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}