"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  X,
  Video,
  Clock,
  Users,
  FileText,
  Play,
  Trash2,
  ExternalLink,
  Loader2,
  Bot,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Download,
  Link,
  Mic,
  FileAudio,
  FileVideo,
  Image,
  CircleCheck,
  CircleDot,
  Circle,
  Timer,
  Hash,
  Globe,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsightsPanel } from "./InsightsPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface MeetingDetailsProps {
  meetingId: string;
  onClose: () => void;
}

interface TranscriptSegment {
  speaker: string;
  text: string;
  start_time: number;
  end_time: number;
}

interface MeetingMetadata {
  video_url?: string;
  audio_url?: string;
  mp4_url?: string;
  transcription_url?: string;
  diarization_url?: string;
  participants?: Array<{ name?: string; email?: string }>;
  speakers?: Array<{ name?: string; duration?: number }>;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ReactNode; dotColor: string }
> = {
  SCHEDULED: {
    label: "Scheduled",
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    icon: <Calendar className="w-3.5 h-3.5" />,
    dotColor: "bg-blue-500",
  },
  JOINING: {
    label: "Joining",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200",
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    dotColor: "bg-amber-500",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
    icon: <Play className="w-3.5 h-3.5" />,
    dotColor: "bg-green-500",
  },
  PROCESSING: {
    label: "Processing",
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    dotColor: "bg-purple-500",
  },
  COMPLETED: {
    label: "Completed",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200",
    icon: <Check className="w-3.5 h-3.5" />,
    dotColor: "bg-emerald-500",
  },
  FAILED: {
    label: "Failed",
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    dotColor: "bg-red-500",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-gray-500",
    bgColor: "bg-gray-50 border-gray-200",
    icon: <X className="w-3.5 h-3.5" />,
    dotColor: "bg-gray-400",
  },
};

// Status timeline order
const statusOrder = ["SCHEDULED", "JOINING", "IN_PROGRESS", "PROCESSING", "COMPLETED"];

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

// Info Card Component
function InfoCard({
  label,
  value,
  icon,
  copyable = false,
  truncate = false
}: {
  label: string;
  value: string | React.ReactNode;
  icon?: React.ReactNode;
  copyable?: boolean;
  truncate?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof value === 'string') {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard");
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-3 hover:border-gray-200 transition-colors">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        {icon}
        <span className="font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium text-gray-900 ${truncate ? 'truncate' : ''}`}>
          {value || "—"}
        </span>
        {copyable && typeof value === 'string' && value && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-gray-400 hover:text-gray-600"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
        )}
      </div>
    </div>
  );
}

// Status Timeline Component
function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = statusOrder.indexOf(currentStatus);
  const isFailed = currentStatus === "FAILED";
  const isCancelled = currentStatus === "CANCELLED";

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Timer className="w-4 h-4 text-gray-500" />
        Status Timeline
      </h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-gray-200" />

        {/* Timeline items */}
        <div className="space-y-4">
          {statusOrder.map((status, index) => {
            const config = statusConfig[status];
            const isPast = index < currentIndex;
            const isCurrent = status === currentStatus;
            const isUpcoming = index > currentIndex;

            return (
              <div key={status} className="flex items-center gap-3 relative">
                {/* Timeline dot */}
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center z-10
                  ${isPast ? 'bg-emerald-100' : isCurrent ? config.bgColor : 'bg-gray-100'}
                  ${isCurrent ? 'ring-2 ring-offset-2 ' + config.bgColor.replace('bg-', 'ring-').replace('-50', '-300') : ''}
                `}>
                  {isPast ? (
                    <CircleCheck className="w-4 h-4 text-emerald-600" />
                  ) : isCurrent ? (
                    <CircleDot className={`w-4 h-4 ${config.color}`} />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300" />
                  )}
                </div>

                {/* Status label */}
                <div className="flex-1">
                  <span className={`
                    text-sm font-medium
                    ${isPast ? 'text-gray-500' : isCurrent ? config.color : 'text-gray-400'}
                  `}>
                    {config.label}
                  </span>
                  {isCurrent && (
                    <span className="ml-2 text-xs text-gray-400">Current</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Show failed/cancelled status if applicable */}
          {(isFailed || isCancelled) && (
            <div className="flex items-center gap-3 relative">
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center z-10
                ${statusConfig[currentStatus].bgColor}
                ring-2 ring-offset-2 ${isFailed ? 'ring-red-300' : 'ring-gray-300'}
              `}>
                {isFailed ? (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <X className="w-4 h-4 text-gray-500" />
                )}
              </div>
              <div className="flex-1">
                <span className={`text-sm font-medium ${statusConfig[currentStatus].color}`}>
                  {statusConfig[currentStatus].label}
                </span>
                <span className="ml-2 text-xs text-gray-400">Current</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Artifact Card Component
function ArtifactCard({
  title,
  url,
  icon,
  type
}: {
  title: string;
  url?: string | null;
  icon: React.ReactNode;
  type: 'video' | 'audio' | 'text' | 'image';
}) {
  if (!url) return null;

  const getFileExtension = (url: string) => {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? match[1].toUpperCase() : type.toUpperCase();
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg hover:border-gray-200 hover:bg-gray-50 transition-all group"
    >
      <div className={`
        p-2 rounded-lg
        ${type === 'video' ? 'bg-purple-50 text-purple-600' : ''}
        ${type === 'audio' ? 'bg-blue-50 text-blue-600' : ''}
        ${type === 'text' ? 'bg-green-50 text-green-600' : ''}
        ${type === 'image' ? 'bg-amber-50 text-amber-600' : ''}
      `}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500">{getFileExtension(url)}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-4 h-4 text-gray-500" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
          <Download className="w-4 h-4 text-gray-500" />
        </Button>
      </div>
    </a>
  );
}

export function MeetingDetails({ meetingId, onClose }: MeetingDetailsProps) {
  const queryClient = useQueryClient();
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [expandedSegments, setExpandedSegments] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: async () => {
      const res = await fetch(`/api/meetings/${meetingId}`);
      if (!res.ok) throw new Error("Failed to fetch meeting");
      return res.json();
    },
    refetchInterval: (query) => {
      const meeting = query.state.data?.meeting;
      // Auto-refresh for active meetings
      if (meeting && ["JOINING", "IN_PROGRESS", "PROCESSING"].includes(meeting.status)) {
        return 10000; // 10 seconds
      }
      return false;
    },
  });

  const joinBotMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/meetings/${meetingId}/join-bot`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to join meeting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Bot is joining the meeting");
    },
    onError: () => {
      toast.error("Failed to start bot");
    },
  });

  const regenerateInsightsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/meetings/${meetingId}/regenerate-insights`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to regenerate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });
      toast.success("Regenerating insights...");
    },
    onError: () => {
      toast.error("Failed to regenerate insights");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting deleted");
      onClose();
    },
    onError: () => {
      toast.error("Failed to delete meeting");
    },
  });

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/refresh-status`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to refresh");
      await queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });
      toast.success("Status refreshed");
    } catch (err) {
      toast.error("Failed to refresh status");
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyMeetingUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast.success("Meeting URL copied");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const meeting = data?.meeting;
  const status = meeting
    ? statusConfig[meeting.status] || statusConfig.SCHEDULED
    : statusConfig.SCHEDULED;
  const transcript = meeting?.transcript;
  const segments: TranscriptSegment[] = transcript?.segments || [];
  const metadata: MeetingMetadata = (meeting?.metadata as MeetingMetadata) || {};

  const filteredSegments = transcriptSearch
    ? segments.filter(
        (s: TranscriptSegment) =>
          s.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
          s.speaker.toLowerCase().includes(transcriptSearch.toLowerCase())
      )
    : segments;

  const canJoinBot = meeting
    ? meeting.status === "SCHEDULED" || meeting.status === "CANCELLED"
    : false;
  const isLive = meeting
    ? meeting.status === "IN_PROGRESS" || meeting.status === "JOINING"
    : false;

  // Get artifact URLs
  const videoUrl = metadata.video_url || metadata.mp4_url || meeting?.recordingUrl;
  const audioUrl = metadata.audio_url;
  const transcriptionUrl = metadata.transcription_url;
  const diarizationUrl = metadata.diarization_url;

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0 overflow-hidden bg-gray-50/50">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error || !meeting ? (
          <div className="flex flex-col items-center justify-center h-full p-6 bg-white">
            <div className="p-4 bg-red-50 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Failed to load meeting
            </p>
            <p className="text-sm text-gray-500 mb-4">
              There was an error loading the meeting details
            </p>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="p-5 pb-4 border-b border-gray-200 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-sm">
                      <Video className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <SheetTitle className="text-lg font-semibold text-gray-900 truncate">
                        {meeting.title}
                      </SheetTitle>
                      {meeting.botId && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          Bot ID: {meeting.botId}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={`${status.bgColor} ${status.color} border font-medium`}
                    >
                      {status.icon}
                      <span className="ml-1">{status.label}</span>
                    </Badge>
                    {isLive && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-full border border-green-200">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-medium text-green-700">Live</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {meeting.botId && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleRefreshStatus}
                          disabled={isRefreshing}
                          className="h-8 w-8"
                        >
                          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refresh Status</TooltipContent>
                    </Tooltip>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this meeting and all
                          associated data including transcripts and insights.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate()}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          {deleteMutation.isPending && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {canJoinBot && (
                  <Button
                    onClick={() => joinBotMutation.mutate()}
                    disabled={joinBotMutation.isPending}
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                  >
                    {joinBotMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                    Send Bot
                  </Button>
                )}
                {meeting.meetingUrl && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyMeetingUrl(meeting.meetingUrl!)}
                      className="gap-2"
                    >
                      {copiedUrl ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      Copy URL
                    </Button>
                    <Button variant="outline" size="sm" asChild className="gap-2">
                      <a
                        href={meeting.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Join Meeting
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </SheetHeader>

            {/* Error Message */}
            {meeting.errorMessage && (
              <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{meeting.errorMessage}</span>
              </div>
            )}

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-5">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard
                    label="Meeting URL"
                    value={meeting.meetingUrl ? new URL(meeting.meetingUrl).hostname : "—"}
                    icon={<Link className="w-3.5 h-3.5" />}
                    copyable={!!meeting.meetingUrl}
                    truncate
                  />
                  <InfoCard
                    label="Created"
                    value={meeting.createdAt ? format(new Date(meeting.createdAt), "MMM d, yyyy h:mm a") : "—"}
                    icon={<Calendar className="w-3.5 h-3.5" />}
                  />
                  <InfoCard
                    label="Duration"
                    value={meeting.duration ? formatDuration(meeting.duration) : "—"}
                    icon={<Timer className="w-3.5 h-3.5" />}
                  />
                  <InfoCard
                    label="Scheduled"
                    value={meeting.scheduledStart ? format(new Date(meeting.scheduledStart), "MMM d, yyyy h:mm a") : "—"}
                    icon={<Clock className="w-3.5 h-3.5" />}
                  />
                  {meeting.calendarEventId && (
                    <InfoCard
                      label="Calendar Event"
                      value={meeting.calendarEventId}
                      icon={<Hash className="w-3.5 h-3.5" />}
                      copyable
                      truncate
                    />
                  )}
                  {meeting.botId && (
                    <InfoCard
                      label="Bot ID"
                      value={meeting.botId}
                      icon={<Bot className="w-3.5 h-3.5" />}
                      copyable
                      truncate
                    />
                  )}
                </div>

                {/* Status Timeline */}
                <StatusTimeline currentStatus={meeting.status} />

                {/* Artifacts Section */}
                {(videoUrl || audioUrl || transcriptionUrl || diarizationUrl) && (
                  <div className="bg-white border border-gray-100 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      Artifacts
                    </h3>
                    <div className="space-y-2">
                      <ArtifactCard
                        title="Video Recording"
                        url={videoUrl}
                        icon={<FileVideo className="w-4 h-4" />}
                        type="video"
                      />
                      <ArtifactCard
                        title="Audio Recording"
                        url={audioUrl}
                        icon={<FileAudio className="w-4 h-4" />}
                        type="audio"
                      />
                      <ArtifactCard
                        title="Transcription"
                        url={transcriptionUrl}
                        icon={<FileText className="w-4 h-4" />}
                        type="text"
                      />
                      <ArtifactCard
                        title="Diarization"
                        url={diarizationUrl}
                        icon={<Mic className="w-4 h-4" />}
                        type="text"
                      />
                    </div>
                  </div>
                )}

                {/* Tabs for Insights, Transcript, Participants */}
                <Tabs defaultValue="insights" className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                  <TabsList className="w-full bg-gray-50 border-b border-gray-100 p-0 h-auto rounded-none">
                    <TabsTrigger
                      value="insights"
                      className="flex-1 gap-2 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:bg-white"
                    >
                      <Sparkles className="w-4 h-4" />
                      Insights
                      {meeting.insights?.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-violet-100 text-violet-700 ml-1"
                        >
                          {meeting.insights.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="transcript"
                      className="flex-1 gap-2 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:bg-white"
                    >
                      <FileText className="w-4 h-4" />
                      Transcript
                    </TabsTrigger>
                    <TabsTrigger
                      value="participants"
                      className="flex-1 gap-2 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:bg-white"
                    >
                      <Users className="w-4 h-4" />
                      <span className="hidden sm:inline">Participants</span>
                      <Badge variant="secondary" className="text-xs ml-1">
                        {meeting.participants?.length || 0}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="insights" className="p-4 m-0">
                    <InsightsPanel
                      insights={meeting.insights || []}
                      onRegenerate={() => regenerateInsightsMutation.mutate()}
                      isRegenerating={regenerateInsightsMutation.isPending}
                    />
                  </TabsContent>

                  <TabsContent value="transcript" className="p-4 m-0">
                    {transcript ? (
                      <div className="space-y-4">
                        {/* Transcript Search */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Search transcript..."
                            value={transcriptSearch}
                            onChange={(e) => setTranscriptSearch(e.target.value)}
                            className="pl-10 bg-gray-50 border-gray-200"
                          />
                          {transcriptSearch && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                              onClick={() => setTranscriptSearch("")}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setExpandedSegments(!expandedSegments)}
                            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                          >
                            {expandedSegments ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            {expandedSegments ? "Show full text" : "Show by speaker"}
                          </button>
                          <span className="text-xs text-gray-400">
                            {segments.length} segments
                            {transcript.wordCount && ` | ${transcript.wordCount} words`}
                          </span>
                        </div>

                        {/* Transcript Content */}
                        {expandedSegments ? (
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {filteredSegments.map(
                              (segment: TranscriptSegment, index: number) => (
                                <div
                                  key={index}
                                  className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                                >
                                  <div className="flex gap-3">
                                    <div className="flex-shrink-0">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm">
                                        <span className="text-xs font-medium text-white">
                                          {segment.speaker.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-gray-900 text-sm">
                                          {segment.speaker}
                                        </span>
                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                          {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                                        </span>
                                      </div>
                                      <p className="text-gray-700 text-sm leading-relaxed">
                                        {segment.text}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none max-h-96 overflow-y-auto">
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {transcript.fullText}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 bg-gray-100 rounded-full mb-4">
                          <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-900 mb-1">
                          No transcript available
                        </p>
                        <p className="text-sm text-gray-500">
                          Transcript will be available after the meeting is completed
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="participants" className="p-4 m-0">
                    {meeting.participants?.length > 0 ? (
                      <div className="space-y-2">
                        {meeting.participants.map(
                          (participant: {
                            id: string;
                            name: string;
                            email?: string;
                            speakingTime?: number;
                          }) => (
                            <div
                              key={participant.id}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-sm">
                                    <span className="text-sm font-medium text-white">
                                      {participant.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {participant.name}
                                    </p>
                                    {participant.email && (
                                      <p className="text-xs text-gray-500">
                                        {participant.email}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {participant.speakingTime && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-violet-50 text-violet-700"
                                  >
                                    <Clock className="w-3 h-3 mr-1" />
                                    {formatDuration(participant.speakingTime)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 bg-gray-100 rounded-full mb-4">
                          <Users className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-900 mb-1">
                          No participants recorded
                        </p>
                        <p className="text-sm text-gray-500">
                          Participant data will be available after the meeting
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
