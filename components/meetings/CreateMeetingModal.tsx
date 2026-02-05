"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Video,
  Loader2,
  Calendar,
  Link2,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface CreateMeetingModalProps {
  open: boolean;
  onClose: () => void;
}

const platformIcons: Record<string, { icon: string; color: string }> = {
  "Google Meet": { icon: "meet", color: "bg-green-100 text-green-700" },
  Zoom: { icon: "zoom", color: "bg-blue-100 text-blue-700" },
  "Microsoft Teams": { icon: "teams", color: "bg-violet-100 text-violet-700" },
};

export function CreateMeetingModal({ open, onClose }: CreateMeetingModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    meetingUrl: "",
    scheduledStart: "",
    scheduledEnd: "",
  });

  // Initialize date on client side only to avoid SSR issues
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      scheduledStart: prev.scheduledStart || format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    }));
  }, []);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          scheduledStart: new Date(data.scheduledStart).toISOString(),
          scheduledEnd: data.scheduledEnd
            ? new Date(data.scheduledEnd).toISOString()
            : undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create meeting");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting created successfully");
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create meeting");
    },
  });

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      meetingUrl: "",
      scheduledStart: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      scheduledEnd: "",
    });
    onClose();
  };

  // Don't render form until client-side date is set
  const isReady = !!formData.scheduledStart;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!formData.meetingUrl.trim()) {
      toast.error("Meeting URL is required");
      return;
    }
    createMutation.mutate(formData);
  };

  const detectPlatform = (url: string) => {
    if (url.includes("meet.google.com")) return "Google Meet";
    if (url.includes("zoom.us") || url.includes("zoom.com")) return "Zoom";
    if (url.includes("teams.microsoft.com") || url.includes("teams.live.com"))
      return "Microsoft Teams";
    return null;
  };

  const platform = detectPlatform(formData.meetingUrl);
  const isValidUrl = formData.meetingUrl && platform;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-violet-50/50 to-purple-50/50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/20">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Add Meeting
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-0.5">
                Add a meeting for AYA to join and take notes
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            {/* Title Input */}
            <div className="space-y-2">
              <Label
                htmlFor="title"
                className="text-sm font-medium text-gray-700 flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                Meeting Title
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g., Weekly Team Standup"
                className="bg-white h-11"
                required
              />
            </div>

            {/* Meeting URL */}
            <div className="space-y-2">
              <Label
                htmlFor="meetingUrl"
                className="text-sm font-medium text-gray-700 flex items-center gap-2"
              >
                <Link2 className="w-3.5 h-3.5 text-gray-400" />
                Meeting URL
                <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="meetingUrl"
                  type="url"
                  value={formData.meetingUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      meetingUrl: e.target.value,
                    }))
                  }
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className={`bg-white h-11 pr-24 ${
                    formData.meetingUrl && !isValidUrl
                      ? "border-amber-300 focus:ring-amber-500"
                      : ""
                  }`}
                  required
                />
                {platform && (
                  <Badge
                    className={`absolute right-2 top-1/2 -translate-y-1/2 ${platformIcons[platform]?.color || "bg-gray-100 text-gray-700"}`}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {platform}
                  </Badge>
                )}
              </div>
              {formData.meetingUrl && !isValidUrl && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  URL not recognized. Supported: Google Meet, Zoom, Teams
                </p>
              )}
            </div>

            <Separator />

            {/* Date/Time Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="scheduledStart"
                  className="text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Start Time
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="scheduledStart"
                  type="datetime-local"
                  value={formData.scheduledStart}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      scheduledStart: e.target.value,
                    }))
                  }
                  className="bg-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="scheduledEnd"
                  className="text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  End Time
                  <span className="text-gray-400 text-xs">(optional)</span>
                </Label>
                <Input
                  id="scheduledEnd"
                  type="datetime-local"
                  value={formData.scheduledEnd}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      scheduledEnd: e.target.value,
                    }))
                  }
                  className="bg-white"
                  min={formData.scheduledStart}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-sm font-medium text-gray-700"
              >
                Description
                <span className="text-gray-400 text-xs ml-1">(optional)</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Add meeting agenda, notes, or context..."
                rows={3}
                className="bg-white resize-none"
              />
            </div>

            {/* Info Card */}
            <Card className="border-blue-100 bg-gradient-to-r from-blue-50/50 to-cyan-50/50">
              <CardContent className="p-3 flex items-start gap-3">
                <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-xs text-blue-700 leading-relaxed">
                  AYA will automatically join this meeting, record the
                  conversation, generate a transcript, and provide AI-powered
                  insights including summaries, action items, and key decisions.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 pt-4 bg-gray-50 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !formData.title || !isValidUrl}
              className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Video className="w-4 h-4" />
              )}
              Create Meeting
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
