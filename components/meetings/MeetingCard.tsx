"use client";

import { useMemo } from "react";
import { formatDistanceToNow, format, isToday, isTomorrow } from "date-fns";
import {
  Video,
  Clock,
  Users,
  FileText,
  Sparkles,
  AlertCircle,
  Loader2,
  Play,
  CheckCircle,
  Calendar,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  Bot,
  BotOff,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MeetingCardProps {
  meeting: {
    id: string;
    title: string;
    platform: string;
    status: string;
    meetingUrl?: string;
    scheduledStart: string;
    scheduledEnd?: string | null;
    duration?: number | null;
    botExcluded?: boolean;
    botId?: string | null;
    _count?: {
      participants: number;
      insights: number;
    };
    transcript?: {
      id: string;
      wordCount?: number | null;
    } | null;
  };
  onClick: () => void;
  onJoinBot?: () => void;
  onToggleBot?: (excluded: boolean) => void;
  onDelete?: () => void;
  onRefreshStatus?: () => void;
  isRefreshing?: boolean;
  isSelected?: boolean;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  SCHEDULED: {
    label: "Scheduled",
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    icon: <Calendar className="w-3.5 h-3.5" />,
  },
  JOINING: {
    label: "Joining",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200",
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  },
  IN_PROGRESS: {
    label: "Live",
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
    icon: <Play className="w-3.5 h-3.5" />,
  },
  PROCESSING: {
    label: "Processing",
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  },
  COMPLETED: {
    label: "Completed",
    color: "text-slate-600",
    bgColor: "bg-slate-50 border-slate-200",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  FAILED: {
    label: "Failed",
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-gray-500",
    bgColor: "bg-gray-50 border-gray-200",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

const platformConfig: Record<string, { label: string; color: string }> = {
  GOOGLE_MEET: { label: "Meet", color: "text-green-600 bg-green-50" },
  ZOOM: { label: "Zoom", color: "text-blue-600 bg-blue-50" },
  MICROSOFT_TEAMS: { label: "Teams", color: "text-violet-600 bg-violet-50" },
};

export function MeetingCard({
  meeting,
  onClick,
  onJoinBot,
  onToggleBot,
  onDelete,
  onRefreshStatus,
  isRefreshing = false,
  isSelected = false,
}: MeetingCardProps) {
  const status = statusConfig[meeting.status] || statusConfig.SCHEDULED;
  const platform = platformConfig[meeting.platform] || {
    label: meeting.platform,
    color: "text-gray-600 bg-gray-50",
  };

  const scheduledStart = new Date(meeting.scheduledStart);

  // Memoize time-sensitive calculations to avoid SSR issues
  const timeState = useMemo(() => {
    const now = Date.now();
    const startTime = scheduledStart.getTime();
    return {
      isPast: startTime < now,
      isUpcoming: startTime > now,
    };
  }, [scheduledStart]);

  const { isPast, isUpcoming } = timeState;
  const hasTranscript = !!meeting.transcript;
  const hasInsights = (meeting._count?.insights || 0) > 0;
  const canJoinBot = (meeting.status === "SCHEDULED" || meeting.status === "CANCELLED") && !meeting.botExcluded;
  const isLive = meeting.status === "IN_PROGRESS" || meeting.status === "JOINING";
  const isBotExcluded = meeting.botExcluded || false;
  const canRefresh = !!meeting.botId && ["JOINING", "IN_PROGRESS", "PROCESSING"].includes(meeting.status);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getDateLabel = () => {
    if (isToday(scheduledStart)) {
      return `Today at ${format(scheduledStart, "h:mm a")}`;
    }
    if (isTomorrow(scheduledStart)) {
      return `Tomorrow at ${format(scheduledStart, "h:mm a")}`;
    }
    return format(scheduledStart, "MMM d 'at' h:mm a");
  };

  return (
    <div
      className={`group relative rounded-xl border bg-white transition-all duration-200 hover:shadow-md hover:border-blue-300 ${
        isSelected
          ? "border-blue-300 ring-2 ring-blue-100 shadow-md"
          : isLive
            ? "border-green-300 shadow-sm"
            : "border-gray-200"
      }`}
    >
      {/* Live indicator pulse */}
      {isLive && (
        <div className="absolute -top-1 -right-1">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        </div>
      )}

      <div className="p-4 cursor-pointer" onClick={onClick}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate text-base group-hover:text-blue-600 transition-colors">
                {meeting.title}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{getDateLabel()}</span>
              {meeting.duration && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-600 font-medium">
                    {formatDuration(meeting.duration)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {meeting.meetingUrl && (
                <DropdownMenuItem asChild>
                  <a
                    href={meeting.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Meeting Link
                  </a>
                </DropdownMenuItem>
              )}
              {canJoinBot && onJoinBot && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onJoinBot();
                  }}
                >
                  <Bot className="w-4 h-4 mr-2" />
                  Send Bot to Join
                </DropdownMenuItem>
              )}
              {canRefresh && onRefreshStatus && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefreshStatus();
                  }}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                  {isRefreshing ? "Refreshing..." : "Refresh Status"}
                </DropdownMenuItem>
              )}
              {isUpcoming && onToggleBot && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleBot(!isBotExcluded);
                  }}
                >
                  {isBotExcluded ? (
                    <>
                      <Bot className="w-4 h-4 mr-2" />
                      Enable Bot for This Meeting
                    </>
                  ) : (
                    <>
                      <BotOff className="w-4 h-4 mr-2" />
                      Disable Bot for This Meeting
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Meeting
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Footer with badges and stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status badge */}
            <Badge
              variant="outline"
              className={`${status.bgColor} ${status.color} border font-medium`}
            >
              {status.icon}
              <span className="ml-1">{status.label}</span>
            </Badge>

            {/* Platform badge */}
            <Badge variant="outline" className={`${platform.color} border-transparent font-medium`}>
              <Video className="w-3 h-3 mr-1" />
              {platform.label}
            </Badge>

            {/* Bot excluded indicator */}
            {isBotExcluded && isUpcoming && (
              <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 font-medium">
                <BotOff className="w-3 h-3 mr-1" />
                Bot Off
              </Badge>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-3">
            {(meeting._count?.participants ?? 0) > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">{meeting._count?.participants}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {meeting._count?.participants} participants
                </TooltipContent>
              </Tooltip>
            )}
            {hasTranscript && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-blue-500">
                    <FileText className="w-4 h-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Transcript available</TooltipContent>
              </Tooltip>
            )}
            {hasInsights && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-purple-500">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>AI insights available</TooltipContent>
              </Tooltip>
            )}
            {isPast && !hasTranscript && meeting.status === "COMPLETED" && (
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(scheduledStart, { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
