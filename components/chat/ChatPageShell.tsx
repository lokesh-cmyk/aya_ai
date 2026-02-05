"use client";

import { useState } from "react";
import { Suspense } from "react";
import { ChatMembersList } from "./ChatMembersList";
import { ChatInterfaceContainer } from "./ChatInterfaceContainer";
import { Search } from "lucide-react";

// Client component shell that manages state and coordinates between components
export function ChatPageShell() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [isAyaChatOpen, setIsAyaChatOpen] = useState(false);

  const handleMemberSelect = (memberId: string) => {
    setSelectedChannelId(null);
    setSelectedMemberIds([memberId]);
    setIsGroupChat(false);
    setIsAyaChatOpen(false); // Close AYA chat when selecting a member
  };

  const handleGroupChatStart = (memberIds: string[]) => {
    setSelectedChannelId(null);
    setSelectedMemberIds(memberIds);
    setIsGroupChat(true);
    setIsAyaChatOpen(false); // Close AYA chat when starting group chat
  };

  const handleOpenAyaChat = () => {
    setSelectedChannelId(null);
    setSelectedMemberIds([]);
    setIsGroupChat(false);
    setIsAyaChatOpen(true);
  };

  const handleCloseAyaChat = () => {
    setIsAyaChatOpen(false);
  };

  return (
    <div className="flex h-full bg-white">
      {/* Team Members Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50/50">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Chat</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Members List - Suspense boundary */}
        <div className="flex-1 overflow-hidden">
          <Suspense
            fallback={
              <div className="p-2 space-y-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-100 animate-pulse"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            }
          >
            <ChatMembersList
              searchQuery={searchQuery}
              onMemberSelect={handleMemberSelect}
              onGroupChatStart={handleGroupChatStart}
              selectedMemberIds={selectedMemberIds}
            />
          </Suspense>
        </div>
      </div>

      {/* Chat Interface - Suspense boundary */}
      <div className="flex-1 flex flex-col min-w-0">
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
              <div className="flex items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white border border-gray-200">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-400">Loading...</span>
                </div>
              </div>
            </div>
          }
        >
          <ChatInterfaceContainer
            selectedChannelId={selectedChannelId}
            selectedMemberIds={selectedMemberIds}
            isGroupChat={isGroupChat}
            onMemberSelect={handleMemberSelect}
            onGroupChatStart={handleGroupChatStart}
            isAyaChatOpen={isAyaChatOpen}
            onOpenAyaChat={handleOpenAyaChat}
            onCloseAyaChat={handleCloseAyaChat}
          />
        </Suspense>
      </div>
    </div>
  );
}
