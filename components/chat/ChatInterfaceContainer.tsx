"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StreamChatInterface } from "@/components/chat/StreamChatInterface";
import { AddContactDialog } from "@/components/chat/AddContactDialog";
import { SendDocumentDialog } from "@/components/chat/SendDocumentDialog";
import { AyaChatInterface } from "@/components/chat/AyaChatInterface";
import { FileText, UserPlus, Sparkles, Users } from "lucide-react";

interface ChatInterfaceContainerProps {
  selectedChannelId: string | null;
  selectedMemberIds: string[];
  isGroupChat: boolean;
  onMemberSelect?: (memberId: string) => void;
  onGroupChatStart?: (memberIds: string[]) => void;
  isAyaChatOpen?: boolean;
  onOpenAyaChat?: () => void;
  onCloseAyaChat?: () => void;
}

export function ChatInterfaceContainer({
  selectedChannelId,
  selectedMemberIds,
  isGroupChat,
  onMemberSelect,
  onGroupChatStart,
  isAyaChatOpen,
  onOpenAyaChat,
  onCloseAyaChat,
}: ChatInterfaceContainerProps) {
  const [showAddContactDialog, setShowAddContactDialog] = useState(false);
  const [showSendDocumentDialog, setShowSendDocumentDialog] = useState(false);

  // Fetch team info
  const { data: membersData, isLoading } = useQuery({
    queryKey: ["chat-members"],
    queryFn: async () => {
      const response = await fetch("/api/chat/members", {
        next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
      });
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
    staleTime: 30000, // Cache for 30 seconds on client
  });

  const teamId = membersData?.teamId || null;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            You must be part of a team to use chat
          </h2>
          <p className="text-gray-500">
            Join or create a team to start chatting with your team members
          </p>
        </div>
      </div>
    );
  }

  // Show AYA AI chat if open
  if (isAyaChatOpen && onCloseAyaChat) {
    return <AyaChatInterface onClose={onCloseAyaChat} />;
  }

  if (selectedChannelId || selectedMemberIds.length > 0) {
    return (
      <StreamChatInterface
        channelId={selectedChannelId || undefined}
        channelType={isGroupChat ? "team" : "messaging"}
        memberIds={selectedMemberIds.length > 0 ? selectedMemberIds : undefined}
      />
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
      <div className="flex items-center justify-center gap-8">
        {/* Send document button */}
        <button
          onClick={() => setShowSendDocumentDialog(true)}
          className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-16 h-16 rounded-xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
            <FileText className="w-8 h-8 text-gray-700" />
          </div>
          <span className="text-sm font-medium text-gray-900">Send document</span>
        </button>

        {/* Add contact button */}
        <button
          onClick={() => setShowAddContactDialog(true)}
          className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-16 h-16 rounded-xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
            <UserPlus className="w-8 h-8 text-gray-700" />
          </div>
          <span className="text-sm font-medium text-gray-900">Add contact</span>
        </button>

        {/* Ask AYA AI button */}
        <button
          onClick={onOpenAyaChat}
          className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center group-hover:from-blue-700 group-hover:to-purple-700 transition-all shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-900">Ask AYA AI</span>
        </button>
      </div>

      {/* Add Contact Dialog */}
      {onMemberSelect && onGroupChatStart && (
        <AddContactDialog
          open={showAddContactDialog}
          onOpenChange={setShowAddContactDialog}
          onMemberSelect={onMemberSelect}
          onGroupChatStart={onGroupChatStart}
        />
      )}

      {/* Send Document Dialog */}
      <SendDocumentDialog
        open={showSendDocumentDialog}
        onOpenChange={setShowSendDocumentDialog}
      />
    </div>
  );
}
