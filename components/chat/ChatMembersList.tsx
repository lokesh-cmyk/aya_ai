"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users, Crown, Shield, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

// Avatar component with fallback for failed images
function MemberAvatar({
  src,
  name,
  size = "md"
}: {
  src?: string;
  name: string;
  size?: "sm" | "md"
}) {
  const [imgError, setImgError] = useState(false);
  const initials = name.charAt(0).toUpperCase();
  const sizeClasses = size === "sm" ? "w-10 h-10" : "w-12 h-12";
  const textSize = size === "sm" ? "text-sm" : "text-base";

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClasses} rounded-full object-cover flex-shrink-0`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0 ${textSize}`}>
      {initials}
    </div>
  );
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
}

interface ChatMembersListProps {
  searchQuery?: string;
  onMemberSelect?: (memberId: string) => void;
  onGroupChat?: () => void;
  selectedMemberIds?: string[];
  onGroupChatStart?: (memberIds: string[]) => void;
}

export function ChatMembersList({
  searchQuery = "",
  onMemberSelect,
  onGroupChat,
  selectedMemberIds = [],
  onGroupChatStart,
}: ChatMembersListProps) {
  const { data: session } = useSession();
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [tempSelectedMemberIds, setTempSelectedMemberIds] = useState<string[]>([]);

  // Fetch team members
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

  const members: TeamMember[] = membersData?.members || [];

  // Filter members based on search
  const filteredMembers = members.filter(
    (member) =>
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Crown className="w-3 h-3 text-yellow-600" />;
      case "EDITOR":
        return <Shield className="w-3 h-3 text-blue-600" />;
      default:
        return null;
    }
  };

  const handleMemberClick = (memberId: string) => {
    if (memberId === session?.user?.id) return;
    onMemberSelect?.(memberId);
  };

  const startGroupChat = (memberIds: string[]) => {
    onGroupChatStart?.(memberIds);
    setShowNewChatDialog(false);
    setTempSelectedMemberIds([]);
  };

  if (isLoading) {
    return (
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {[1, 2, 3, 4, 5].map((i) => (
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
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {/* Group Chat Option */}
        <button
          onClick={onGroupChat}
          className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left hover:bg-gray-100 border border-transparent"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">Group Chat</p>
            <p className="text-xs text-gray-500">Start a team conversation</p>
          </div>
        </button>

        {filteredMembers.map((member) => {
          const isSelected = selectedMemberIds.includes(member.id);
          const isCurrentUser = member.id === session?.user?.id;
          const initials = (member.name || member.email)
            .charAt(0)
            .toUpperCase();

          return (
            <button
              key={member.id}
              onClick={() => handleMemberClick(member.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                isSelected
                  ? "bg-blue-50 border border-blue-200"
                  : "hover:bg-gray-100 border border-transparent"
              )}
            >
              {/* Avatar with fallback */}
              <MemberAvatar
                src={member.image}
                name={member.name || member.email}
                size="md"
              />

              {/* Member Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {member.name || member.email}
                    {isCurrentUser && (
                      <span className="text-xs text-gray-500 ml-1">(You)</span>
                    )}
                  </p>
                  {getRoleIcon(member.role)}
                </div>
                <p className="text-xs text-gray-500 truncate">{member.email}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Group Chat Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full absolute top-4 right-4"
            onClick={() => setShowNewChatDialog(true)}
          >
            <Plus className="w-5 h-5 text-gray-500" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Group Chat</DialogTitle>
            <DialogDescription>
              Select team members to start a group conversation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredMembers
              .filter((m) => m.id !== session?.user?.id)
              .map((member) => (
                <button
                  key={member.id}
                  onClick={() => {
                    const current = tempSelectedMemberIds.includes(member.id)
                      ? tempSelectedMemberIds.filter((id) => id !== member.id)
                      : [...tempSelectedMemberIds, member.id];
                    setTempSelectedMemberIds(current);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                    tempSelectedMemberIds.includes(member.id)
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-100 border border-transparent"
                  )}
                >
                  <MemberAvatar
                    src={member.image}
                    name={member.name || member.email}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.name || member.email}
                    </p>
                  </div>
                </button>
              ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowNewChatDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => startGroupChat(tempSelectedMemberIds)}
              disabled={tempSelectedMemberIds.length === 0}
              className="flex-1"
            >
              Start Group Chat ({tempSelectedMemberIds.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}
