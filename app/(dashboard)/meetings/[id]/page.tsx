"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
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
  Timer,
  Hash,
  CircleCheck,
  CircleDot,
  Circle,
  X,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsightsPanel } from "@/components/meetings/InsightsPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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
  { label: string; color: string; bgColor: string; textColor: string; borderColor: string }
> = {
  SCHEDULED: {
    label: "Scheduled",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
  },
  JOINING: {
    label: "Joining",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "text-green-600",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
  },
  PROCESSING: {
    label: "Processing",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
    borderColor: "border-purple-200",
  },
  COMPLETED: {
    label: "Completed",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200",
  },
  FAILED: {
    label: "Failed",
    color: "text-red-600",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    borderColor: "border-red-200",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    textColor: "text-gray-600",
    borderColor: "border-gray-200",
  },
};

const statusOrder = ["SCHEDULED", "JOINING", "IN_PROGRESS", "PROCESSING", "COMPLETED"];

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-64 col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}

// Info Card Component
function InfoCard({
  label,
  value,
  icon,
  copyValue,
}: {
  label: string;
  value: string | React.ReactNode;
  icon: React.ReactNode;
  copyValue?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (copyValue) {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-gray-500">
          {icon}
          <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
        </div>
        {copyValue && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-gray-600"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        )}
      </div>
      <p className="text-base font-semibold text-gray-900 truncate">{value || "—"}</p>
    </div>
  );
}

// Status Timeline Component
function StatusTimeline({ currentStatus, createdAt, actualStart, actualEnd }: {
  currentStatus: string;
  createdAt?: string;
  actualStart?: string;
  actualEnd?: string;
}) {
  const currentIndex = statusOrder.indexOf(currentStatus);
  const isFailed = currentStatus === "FAILED";
  const isCancelled = currentStatus === "CANCELLED";

  const getTimeForStatus = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return createdAt ? format(new Date(createdAt), "h:mm a") : null;
      case "IN_PROGRESS":
        return actualStart ? format(new Date(actualStart), "h:mm a") : null;
      case "COMPLETED":
        return actualEnd ? format(new Date(actualEnd), "h:mm a") : null;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Timer className="w-4 h-4 text-gray-500" />
        Status Timeline
      </h3>
      <div className="relative">
        {/* Horizontal timeline */}
        <div className="flex items-center justify-between relative">
          {/* Progress line background */}
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-gray-200" />
          {/* Progress line filled */}
          <div
            className="absolute left-0 top-4 h-0.5 bg-emerald-500 transition-all duration-500"
            style={{
              width: isFailed || isCancelled
                ? '0%'
                : `${Math.min((currentIndex / (statusOrder.length - 1)) * 100, 100)}%`
            }}
          />

          {statusOrder.map((status, index) => {
            const config = statusConfig[status];
            const isPast = index < currentIndex;
            const isCurrent = status === currentStatus;
            const time = getTimeForStatus(status);

            return (
              <div key={status} className="flex flex-col items-center relative z-10">
                {/* Dot */}
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                    ${isPast ? 'bg-emerald-500 border-emerald-500' : ''}
                    ${isCurrent && !isFailed && !isCancelled ? `${config.bgColor} ${config.borderColor} ring-4 ring-offset-2 ring-${config.color.replace('text-', '')}/20` : ''}
                    ${!isPast && !isCurrent ? 'bg-white border-gray-300' : ''}
                  `}
                >
                  {isPast ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : isCurrent ? (
                    <CircleDot className={`w-4 h-4 ${config.color}`} />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`
                    mt-3 text-xs font-medium
                    ${isPast ? 'text-gray-500' : isCurrent ? config.color : 'text-gray-400'}
                  `}
                >
                  {config.label}
                </span>

                {/* Time */}
                {time && (
                  <span className="text-[10px] text-gray-400 mt-1">{time}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Failed/Cancelled indicator */}
        {(isFailed || isCancelled) && (
          <div className="mt-6 flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <span className="text-sm font-medium text-red-700">
                {statusConfig[currentStatus].label}
              </span>
              <p className="text-xs text-red-500">Meeting did not complete successfully</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Artifact Card Component
function ArtifactCard({
  title,
  url,
  icon,
  color,
  description,
}: {
  title: string;
  url?: string | null;
  icon: React.ReactNode;
  color: string;
  description?: string;
}) {
  if (!url) return null;

  const getFileInfo = (url: string) => {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? match[1].toUpperCase() : "FILE";
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group">
      <div className={`p-3 rounded-xl ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{description || getFileInfo(url)}</p>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open in new tab</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" asChild>
              <a href={url} download>
                <Download className="w-4 h-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export default function MeetingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: meetingId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [expandedSegments, setExpandedSegments] = useState(true);
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
      if (meeting && ["JOINING", "IN_PROGRESS", "PROCESSING"].includes(meeting.status)) {
        return 10000;
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
      const res = await fetch(`/api/meetings/${meetingId}/regenerate-insights`, {
        method: "POST",
      });
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
      router.push("/meetings");
    },
    onError: () => {
      toast.error("Failed to delete meeting");
    },
  });

  const reprocessMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/meetings/${meetingId}/reprocess`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reprocess");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });
      toast.success("Reprocessing started - transcript and insights will be regenerated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reprocess meeting");
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
    } catch {
      toast.error("Failed to refresh status");
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
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

  if (isLoading) return <LoadingSkeleton />;

  if (error || !data?.meeting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Meeting not found</h2>
          <p className="text-gray-500 mb-6">The meeting you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => router.push("/meetings")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Meetings
          </Button>
        </div>
      </div>
    );
  }

  const meeting = data.meeting;
  const status = statusConfig[meeting.status] || statusConfig.SCHEDULED;
  const transcript = meeting.transcript;
  const segments: TranscriptSegment[] = transcript?.segments || [];
  const metadata: MeetingMetadata = (meeting.metadata as MeetingMetadata) || {};

  const filteredSegments = transcriptSearch
    ? segments.filter(
        (s) =>
          s.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
          s.speaker.toLowerCase().includes(transcriptSearch.toLowerCase())
      )
    : segments;

  const canJoinBot = meeting.status === "SCHEDULED" || meeting.status === "CANCELLED";
  const isLive = meeting.status === "IN_PROGRESS" || meeting.status === "JOINING";

  const videoUrl = metadata.video_url || metadata.mp4_url || meeting.recordingUrl;
  const audioUrl = metadata.audio_url;
  const transcriptionUrl = metadata.transcription_url;
  const diarizationUrl = metadata.diarization_url;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/meetings")}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-sm">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold text-gray-900">{meeting.title}</h1>
                    <Badge
                      className={`${status.bgColor} ${status.textColor} ${status.borderColor} border font-medium`}
                    >
                      {meeting.status === "JOINING" || meeting.status === "PROCESSING" ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : null}
                      {status.label}
                    </Badge>
                    {isLive && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-full border border-green-200">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-medium text-green-700">Live</span>
                      </div>
                    )}
                  </div>
                  {meeting.botId && (
                    <p className="text-sm text-gray-500 font-mono mt-0.5">
                      Bot: {meeting.botId}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canJoinBot && (
                <Button
                  onClick={() => joinBotMutation.mutate()}
                  disabled={joinBotMutation.isPending}
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
                <Button variant="outline" asChild className="gap-2">
                  <a href={meeting.meetingUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    Join Meeting
                  </a>
                </Button>
              )}
              {meeting.botId && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefreshStatus}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {meeting.meetingUrl && (
                    <DropdownMenuItem onClick={() => copyToClipboard(meeting.meetingUrl!, "Meeting URL")}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Meeting URL
                    </DropdownMenuItem>
                  )}
                  {meeting.botId && (
                    <DropdownMenuItem onClick={() => copyToClipboard(meeting.botId!, "Bot ID")}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Bot ID
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {(meeting.status === "PROCESSING" || meeting.status === "COMPLETED" || meeting.recordingUrl) && (
                    <DropdownMenuItem
                      onClick={() => reprocessMutation.mutate()}
                      disabled={reprocessMutation.isPending}
                    >
                      {reprocessMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Reprocess Transcript
                    </DropdownMenuItem>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Meeting
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this meeting and all associated data
                          including transcripts and insights. This action cannot be undone.
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {meeting.errorMessage && (
        <div className="max-w-7xl mx-auto px-6 mt-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{meeting.errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Info Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <InfoCard
            label="Meeting URL"
            value={meeting.meetingUrl ? new URL(meeting.meetingUrl).hostname : "—"}
            icon={<Link className="w-4 h-4" />}
            copyValue={meeting.meetingUrl}
          />
          <InfoCard
            label="Scheduled"
            value={meeting.scheduledStart ? format(new Date(meeting.scheduledStart), "MMM d, yyyy h:mm a") : "—"}
            icon={<Calendar className="w-4 h-4" />}
          />
          <InfoCard
            label="Duration"
            value={meeting.duration ? formatDuration(meeting.duration) : "—"}
            icon={<Timer className="w-4 h-4" />}
          />
          <InfoCard
            label="Participants"
            value={meeting.participants?.length || 0}
            icon={<Users className="w-4 h-4" />}
          />
        </div>

        {/* Status Timeline */}
        <div className="mb-8">
          <StatusTimeline
            currentStatus={meeting.status}
            createdAt={meeting.createdAt}
            actualStart={meeting.actualStart}
            actualEnd={meeting.actualEnd}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Artifacts & Participants */}
          <div className="space-y-6">
            {/* Artifacts */}
            {(videoUrl || audioUrl || transcriptionUrl || diarizationUrl) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  Artifacts
                </h3>
                <div className="space-y-3">
                  <ArtifactCard
                    title="Video Recording"
                    url={videoUrl}
                    icon={<FileVideo className="w-5 h-5 text-purple-600" />}
                    color="bg-purple-50"
                    description="MP4 Video"
                  />
                  <ArtifactCard
                    title="Audio Recording"
                    url={audioUrl}
                    icon={<FileAudio className="w-5 h-5 text-blue-600" />}
                    color="bg-blue-50"
                    description="Audio File"
                  />
                  <ArtifactCard
                    title="Transcription"
                    url={transcriptionUrl}
                    icon={<FileText className="w-5 h-5 text-green-600" />}
                    color="bg-green-50"
                    description="Text Transcript"
                  />
                  <ArtifactCard
                    title="Speaker Diarization"
                    url={diarizationUrl}
                    icon={<Mic className="w-5 h-5 text-amber-600" />}
                    color="bg-amber-50"
                    description="JSONL Format"
                  />
                </div>
              </div>
            )}

            {/* Participants */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                Participants ({meeting.participants?.length || 0})
              </h3>
              {meeting.participants?.length > 0 ? (
                <div className="space-y-2">
                  {meeting.participants.map(
                    (participant: { id: string; name: string; email?: string; speakingTime?: number }) => (
                      <div
                        key={participant.id}
                        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-sm">
                          <span className="text-sm font-medium text-white">
                            {participant.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {participant.name}
                          </p>
                          {participant.email && (
                            <p className="text-xs text-gray-500 truncate">{participant.email}</p>
                          )}
                        </div>
                        {participant.speakingTime && (
                          <Badge variant="secondary" className="bg-violet-50 text-violet-700">
                            {formatDuration(participant.speakingTime)}
                          </Badge>
                        )}
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No participants recorded</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Insights & Transcript */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="insights" className="bg-white rounded-xl border border-gray-200">
              <TabsList className="w-full bg-gray-50 p-1.5 rounded-t-xl border-b border-gray-200 h-auto">
                <TabsTrigger
                  value="insights"
                  className="flex-1 gap-2 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Insights
                  {meeting.insights?.length > 0 && (
                    <Badge className="bg-violet-100 text-violet-700 text-xs">
                      {meeting.insights.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="transcript"
                  className="flex-1 gap-2 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  Transcript
                  {segments.length > 0 && (
                    <Badge className="bg-gray-100 text-gray-700 text-xs">
                      {segments.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="insights" className="p-6 m-0">
                <InsightsPanel
                  insights={meeting.insights || []}
                  onRegenerate={() => regenerateInsightsMutation.mutate()}
                  isRegenerating={regenerateInsightsMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="transcript" className="p-6 m-0">
                {transcript ? (
                  <div className="space-y-4">
                    {/* Search and Controls */}
                    <div className="flex items-center gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search transcript..."
                          value={transcriptSearch}
                          onChange={(e) => setTranscriptSearch(e.target.value)}
                          className="pl-10"
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedSegments(!expandedSegments)}
                        className="gap-2"
                      >
                        {expandedSegments ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Full Text
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            By Speaker
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{segments.length} segments</span>
                      {transcript.wordCount && <span>{transcript.wordCount} words</span>}
                      {transcript.duration && <span>{formatDuration(transcript.duration)}</span>}
                    </div>

                    {/* Content */}
                    <ScrollArea className="h-[500px] rounded-lg border border-gray-100">
                      {expandedSegments ? (
                        <div className="space-y-3 p-4">
                          {filteredSegments.map((segment, index) => (
                            <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
                                <span className="text-xs font-medium text-white">
                                  {segment.speaker.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900 text-sm">
                                    {segment.speaker}
                                  </span>
                                  <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded border">
                                    {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                                  </span>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                  {segment.text}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4">
                          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                            {transcript.fullText}
                          </p>
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No transcript available</h3>
                    <p className="text-gray-500">
                      Transcript will be available after the meeting is completed and processed.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
