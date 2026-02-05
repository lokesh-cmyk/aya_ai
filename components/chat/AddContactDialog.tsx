"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Crown, Shield, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
}

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberSelect: (memberId: string) => void;
  onGroupChatStart: (memberIds: string[]) => void;
}

function MemberAvatar({
  src,
  name,
}: {
  src?: string;
  name: string;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = name.charAt(0).toUpperCase();

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0 text-sm">
      {initials}
    </div>
  );
}

export function AddContactDialog({
  open,
  onOpenChange,
  onMemberSelect,
  onGroupChatStart,
}: AddContactDialogProps) {
  const { data: session } = useSession();
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Reset selection when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedMemberIds([]);
      setSearchQuery("");
    }
  }, [open]);

  // Fetch team members
  const { data: membersData, isLoading } = useQuery({
    queryKey: ["chat-members"],
    queryFn: async () => {
      const response = await fetch("/api/chat/members");
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
    staleTime: 30000,
  });

  const members: TeamMember[] = membersData?.members || [];

  // Filter out current user and apply search
  const filteredMembers = members.filter(
    (member) =>
      member.id !== session?.user?.id &&
      (member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase()))
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

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleStartChat = () => {
    if (selectedMemberIds.length === 1) {
      onMemberSelect(selectedMemberIds[0]);
    } else if (selectedMemberIds.length > 1) {
      onGroupChatStart(selectedMemberIds);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a Chat</DialogTitle>
          <DialogDescription>
            Select team members to start a conversation
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm"
          />
        </div>

        {/* Members List */}
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No team members found
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isSelected = selectedMemberIds.includes(member.id);

              return (
                <button
                  key={member.id}
                  onClick={() => toggleMemberSelection(member.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                    isSelected
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50 border border-transparent"
                  )}
                >
                  <MemberAvatar
                    src={member.image}
                    name={member.name || member.email}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.name || member.email}
                      </p>
                      {getRoleIcon(member.role)}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {member.email}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartChat}
            disabled={selectedMemberIds.length === 0}
            className="flex-1"
          >
            {selectedMemberIds.length > 1
              ? `Start Group Chat (${selectedMemberIds.length})`
              : "Start Chat"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
