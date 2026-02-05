"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Save,
  Loader2,
  Image as ImageIcon,
  MessageSquare,
  Video,
  Zap,
  CheckCircle,
  Sparkles,
  Mic,
  Grid3X3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface BotSettings {
  id: string;
  botName: string;
  botImage: string | null;
  entryMessage: string | null;
  recordingMode: "SPEAKER_VIEW" | "GALLERY_VIEW" | "AUDIO_ONLY";
  autoJoinEnabled: boolean;
}

interface BotSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

const recordingModes = [
  {
    value: "SPEAKER_VIEW",
    label: "Speaker View",
    description: "Focus on active speaker",
    icon: Video,
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50 hover:bg-blue-100 border-blue-200",
    activeColor: "bg-blue-100 border-blue-400 ring-2 ring-blue-200",
  },
  {
    value: "GALLERY_VIEW",
    label: "Gallery View",
    description: "Show all participants",
    icon: Grid3X3,
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-50 hover:bg-purple-100 border-purple-200",
    activeColor: "bg-purple-100 border-purple-400 ring-2 ring-purple-200",
  },
  {
    value: "AUDIO_ONLY",
    label: "Audio Only",
    description: "Record audio without video",
    icon: Mic,
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-50 hover:bg-amber-100 border-amber-200",
    activeColor: "bg-amber-100 border-amber-400 ring-2 ring-amber-200",
  },
];

export function BotSettingsModal({ open, onClose }: BotSettingsModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<BotSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading } = useQuery<{ settings: BotSettings }>({
    queryKey: ["meeting-bot-settings"],
    queryFn: async () => {
      const res = await fetch("/api/meetings/bot-settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    staleTime: 0,
  });

  const settings = data?.settings;

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<BotSettings>) => {
      const res = await fetch("/api/meetings/bot-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-bot-settings"] });
      setHasChanges(false);
      toast.success("Settings saved successfully!");
      onClose();
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  const handleChange = (field: keyof BotSettings, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const getValue = <K extends keyof BotSettings>(field: K): BotSettings[K] => {
    return (formData[field] ?? settings?.[field]) as BotSettings[K];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          </div>

          <div className="relative flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">
                Bot Settings
              </DialogTitle>
              <DialogDescription className="text-white/80 mt-0.5">
                Customize how AYA joins and records your meetings
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <SettingsSkeleton />
        ) : (
          <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
            {/* Auto Join Toggle */}
            <div
              onClick={() => handleChange("autoJoinEnabled", !getValue("autoJoinEnabled"))}
              className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                getValue("autoJoinEnabled")
                  ? "bg-gradient-to-r from-violet-50 to-purple-50 border-violet-300 shadow-lg shadow-violet-100"
                  : "bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl transition-all duration-300 ${
                      getValue("autoJoinEnabled")
                        ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-300"
                        : "bg-gray-200"
                    }`}
                  >
                    <Zap
                      className={`w-5 h-5 transition-colors ${
                        getValue("autoJoinEnabled") ? "text-white" : "text-gray-500"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">Auto-Join Meetings</p>
                      {getValue("autoJoinEnabled") && (
                        <Badge className="bg-green-100 text-green-700 border-0 animate-in fade-in duration-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Automatically join scheduled calendar meetings
                    </p>
                  </div>
                </div>
                <Switch
                  checked={getValue("autoJoinEnabled") || false}
                  onCheckedChange={(checked) => handleChange("autoJoinEnabled", checked)}
                  className="pointer-events-none"
                />
              </div>
            </div>

            {/* Bot Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-violet-500" />
                Bot Identity
              </div>

              {/* Bot Name & Avatar */}
              <div className="grid grid-cols-[auto_1fr] gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
                {/* Avatar Preview */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner ${
                      getValue("botImage") ? "bg-white" : "bg-gradient-to-br from-violet-400 to-purple-500"
                    }`}
                  >
                    {getValue("botImage") ? (
                      <img
                        src={getValue("botImage") || ""}
                        alt="Bot avatar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Bot className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500">Preview</span>
                </div>

                {/* Name & Avatar URL Inputs */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="botName" className="text-sm font-medium text-gray-700">
                      Display Name
                    </Label>
                    <Input
                      id="botName"
                      value={getValue("botName") || ""}
                      onChange={(e) => handleChange("botName", e.target.value)}
                      placeholder="AYA Meeting Assistant"
                      maxLength={50}
                      className="bg-white border-gray-200 focus:border-violet-400 focus:ring-violet-200 cursor-text"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="botImage" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                      Avatar URL
                    </Label>
                    <Input
                      id="botImage"
                      type="url"
                      value={getValue("botImage") || ""}
                      onChange={(e) => handleChange("botImage", e.target.value || null)}
                      placeholder="https://example.com/avatar.png"
                      className="bg-white border-gray-200 focus:border-violet-400 focus:ring-violet-200 cursor-text"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Entry Message */}
            <div className="space-y-3">
              <Label htmlFor="entryMessage" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-violet-500" />
                Entry Message
              </Label>
              <div className="relative">
                <Textarea
                  id="entryMessage"
                  value={getValue("entryMessage") || ""}
                  onChange={(e) => handleChange("entryMessage", e.target.value || null)}
                  placeholder="Hi! I'm AYA, your meeting assistant. I'll be taking notes during this meeting."
                  maxLength={200}
                  rows={3}
                  className="bg-gray-50 border-gray-200 focus:border-violet-400 focus:ring-violet-200 resize-none pr-16 cursor-text"
                />
                <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                  {(getValue("entryMessage") || "").length}/200
                </span>
              </div>
              <p className="text-xs text-gray-500">
                This message is sent to the meeting chat when the bot joins
              </p>
            </div>

            {/* Recording Mode */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                <Video className="w-4 h-4 text-violet-500" />
                Recording Mode
              </div>
              <div className="grid grid-cols-3 gap-3">
                {recordingModes.map((mode) => {
                  const isActive = getValue("recordingMode") === mode.value;
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => handleChange("recordingMode", mode.value)}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${
                        isActive ? mode.activeColor : mode.bgColor
                      }`}
                    >
                      {isActive && (
                        <div className="absolute -top-1.5 -right-1.5">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                      <div
                        className={`w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <p className="font-medium text-gray-900 text-sm">{mode.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{mode.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 pt-4 bg-gray-50 border-t border-gray-200">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
            className={`gap-2 cursor-pointer transition-all duration-300 ${
              hasChanges
                ? "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-300/50"
                : "bg-gray-300 text-gray-500"
            }`}
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {hasChanges ? "Save Changes" : "No Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Keep the old export for backward compatibility but mark as deprecated
export function BotSettingsPanel() {
  return (
    <div className="p-4 text-center text-gray-500">
      <p>Please use BotSettingsModal component instead</p>
    </div>
  );
}
