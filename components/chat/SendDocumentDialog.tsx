"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { useStreamClient } from "@/lib/stream/stream-client-browser";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Crown, Shield, Check, FileUp, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
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

interface SendDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MemberAvatar({ src, name }: { src?: string; name: string }) {
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

export function SendDocumentDialog({
  open,
  onOpenChange,
}: SendDocumentDialogProps) {
  const { data: session } = useSession();
  const { client, isConnected } = useStreamClient();
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedMemberIds([]);
      setSelectedFile(null);
      setSearchQuery("");
      setIsSending(false);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (20MB limit)
      const maxSize = 20 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(
          `File too large. Maximum size is 20MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB`
        );
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const createChannelId = async (members: string[]): Promise<string> => {
    const combined = members.join("-");
    if (combined.length <= 60) {
      return combined;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(combined);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const hashNum = BigInt("0x" + hashHex.substring(0, 16));
      return `dm-${hashNum.toString(36)}`;
    } catch {
      let hash = 0;
      for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return `dm-${Math.abs(hash).toString(36)}`;
    }
  };

  const handleSendDocument = async () => {
    if (!client || !isConnected || !selectedFile || selectedMemberIds.length === 0) {
      return;
    }

    setIsSending(true);
    const sendToast = toast.loading(
      `Sending ${selectedFile.name} to ${selectedMemberIds.length} recipient(s)...`
    );

    try {
      let successCount = 0;
      let failCount = 0;

      for (const recipientId of selectedMemberIds) {
        try {
          // Create channel members array
          const allMembers = [session!.user.id, recipientId].sort();
          const channelId = await createChannelId(allMembers);

          // Ensure users exist in Stream
          try {
            await fetch("/api/chat/ensure-stream-users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userIds: allMembers }),
            });
          } catch {
            // Continue even if this fails
          }

          // Create or get channel
          const channel = client.channel("messaging", channelId, {
            members: allMembers,
          });
          await channel.create();
          await channel.watch();

          // Upload file to Stream CDN
          let response;
          if (selectedFile.type.startsWith("image/")) {
            response = await channel.sendImage(selectedFile);
          } else {
            response = await channel.sendFile(selectedFile);
          }

          if (response?.file) {
            // Send message with attachment
            const attachmentType = selectedFile.type.startsWith("image/")
              ? "image"
              : "file";

            await channel.sendMessage({
              text: "",
              attachments: [
                {
                  type: attachmentType,
                  asset_url: response.file,
                  title: selectedFile.name,
                  file_size: selectedFile.size,
                  mime_type: selectedFile.type,
                },
              ],
            });

            successCount++;
          }
        } catch (err) {
          console.error(`Failed to send to recipient ${recipientId}:`, err);
          failCount++;
        }
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(
          `${selectedFile.name} sent to ${successCount} recipient(s)`,
          { id: sendToast }
        );
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(
          `Sent to ${successCount} recipient(s), failed for ${failCount}`,
          { id: sendToast }
        );
      } else {
        toast.error("Failed to send document", { id: sendToast });
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending document:", error);
      toast.error(`Failed to send document: ${error?.message || "Unknown error"}`, {
        id: sendToast,
      });
    } finally {
      setIsSending(false);
    }
  };

  const canSend =
    isConnected &&
    selectedFile !== null &&
    selectedMemberIds.length > 0 &&
    !isSending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Document</DialogTitle>
          <DialogDescription>
            Select recipients and upload a document to send
          </DialogDescription>
        </DialogHeader>

        {/* File Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Document</label>
          {selectedFile ? (
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <FileUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={handleRemoveFile}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <FileUp className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                Click to select a file
              </span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="*/*"
          />
        </div>

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

        {/* Recipients Label */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Select Recipients
          </label>
          {selectedMemberIds.length > 0 && (
            <span className="text-xs text-blue-600 font-medium">
              {selectedMemberIds.length} selected
            </span>
          )}
        </div>

        {/* Members List */}
        <div className="space-y-1 max-h-60 overflow-y-auto">
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
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendDocument}
            disabled={!canSend}
            className="flex-1"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              `Send${selectedMemberIds.length > 0 ? ` (${selectedMemberIds.length})` : ""}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
