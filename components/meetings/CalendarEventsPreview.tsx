"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isTomorrow, parseISO, isThisWeek } from "date-fns";
import {
  Calendar,
  Video,
  Clock,
  Bot,
  BotOff,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Loader2,
  Users,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";

interface CalendarEvent {
  event_id: string;
  summary: string;
  description?: string;
  start_time: string;
  end_time?: string;
  meeting_url?: string;
  attendees?: Array<{ email: string; name?: string }>;
  meetingId: string | null;
  meetingStatus: string | null;
  botExcluded: boolean;
  hasBotScheduled: boolean;
}

interface CalendarEventsPreviewProps {
  onEventClick?: (eventId: string, meetingId: string | null) => void;
}

const platformFromUrl = (url: string): { label: string; color: string; bgColor: string } => {
  if (url.includes("meet.google.com")) {
    return { label: "Meet", color: "text-green-700", bgColor: "bg-green-100" };
  }
  if (url.includes("zoom.us") || url.includes("zoom.com")) {
    return { label: "Zoom", color: "text-blue-700", bgColor: "bg-blue-100" };
  }
  if (url.includes("teams.microsoft.com") || url.includes("teams.live.com")) {
    return { label: "Teams", color: "text-violet-700", bgColor: "bg-violet-100" };
  }
  return { label: "Video", color: "text-gray-700", bgColor: "bg-gray-100" };
};

function EventCardSkeleton() {
  return (
    <div className="p-3 border rounded-xl bg-white">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-12" />
      </div>
    </div>
  );
}

interface GroupedEvents {
  today: CalendarEvent[];
  tomorrow: CalendarEvent[];
  thisWeek: CalendarEvent[];
  later: CalendarEvent[];
}

export function CalendarEventsPreview({ onEventClick }: CalendarEventsPreviewProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch calendar events with real-time polling
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      const res = await fetch("/api/meetings/calendar-events?days=14");
      if (!res.ok) throw new Error("Failed to fetch calendar events");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true,
    staleTime: 15000,
  });

  // Toggle bot mutation (for existing meetings)
  const toggleBotMutation = useMutation({
    mutationFn: async ({ meetingId, botExcluded }: { meetingId: string; botExcluded: boolean }) => {
      const res = await fetch(`/api/meetings/${meetingId}/toggle-bot`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botExcluded }),
      });
      if (!res.ok) throw new Error("Failed to toggle bot");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetings-all"] });
      toast.success(data.message);
    },
    onError: () => {
      toast.error("Failed to toggle bot setting");
    },
  });

  // Create meeting from calendar event mutation (for events without meetingId)
  const createFromEventMutation = useMutation({
    mutationFn: async ({
      event,
      botExcluded,
    }: {
      event: CalendarEvent;
      botExcluded: boolean;
    }) => {
      const res = await fetch("/api/meetings/from-calendar-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.event_id,
          title: event.summary,
          meetingUrl: event.meeting_url,
          startTime: event.start_time,
          endTime: event.end_time,
          botExcluded,
        }),
      });
      if (!res.ok) throw new Error("Failed to update meeting settings");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetings-all"] });
      toast.success(data.message);
    },
    onError: () => {
      toast.error("Failed to update meeting settings");
    },
  });

  if (!data?.connected) {
    return null;
  }

  const events: CalendarEvent[] = data?.events || [];
  const eventsWithMeetingUrl = events.filter((e) => e.meeting_url);
  const hasError = data?.error;

  // Group events by time
  const groupedEvents: GroupedEvents = {
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
  };

  eventsWithMeetingUrl.forEach((event) => {
    const date = parseISO(event.start_time);
    if (isToday(date)) {
      groupedEvents.today.push(event);
    } else if (isTomorrow(date)) {
      groupedEvents.tomorrow.push(event);
    } else if (isThisWeek(date)) {
      groupedEvents.thisWeek.push(event);
    } else {
      groupedEvents.later.push(event);
    }
  });

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return format(date, "h:mm a");
    }
    if (isTomorrow(date)) {
      return `Tomorrow ${format(date, "h:mm a")}`;
    }
    return format(date, "EEE, MMM d 'at' h:mm a");
  };

  const renderEventCard = (event: CalendarEvent) => {
    const platform = platformFromUrl(event.meeting_url || "");
    const isBotEnabled = event.meetingId ? !event.botExcluded : false;
    const isScheduled = event.meetingId && !event.botExcluded;
    const isPending = toggleBotMutation.isPending || createFromEventMutation.isPending;

    return (
      <div
        key={event.event_id}
        className={`group p-3 border rounded-xl transition-all duration-200 cursor-pointer hover:shadow-md ${
          isBotEnabled
            ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300"
            : "bg-white border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => onEventClick?.(event.event_id, event.meetingId)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-medium text-sm text-gray-900 truncate">
                {event.summary || "Untitled Meeting"}
              </span>
              {isScheduled && (
                <Tooltip>
                  <TooltipTrigger>
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>Bot scheduled to join</TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-medium">{getDateLabel(event.start_time)}</span>
              <Badge className={`${platform.bgColor} ${platform.color} text-[10px] px-1.5 py-0 border-0`}>
                <Video className="w-2.5 h-2.5 mr-0.5" />
                {platform.label}
              </Badge>
            </div>
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1.5">
                <Users className="w-3 h-3" />
                {event.attendees.slice(0, 2).map((a) => a.name || a.email.split("@")[0]).join(", ")}
                {event.attendees.length > 2 && ` +${event.attendees.length - 2}`}
              </div>
            )}
          </div>

          {/* Bot toggle */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-white/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  ) : isBotEnabled ? (
                    <Bot className="w-4 h-4 text-green-600" />
                  ) : (
                    <BotOff className="w-4 h-4 text-gray-400" />
                  )}
                  <Switch
                    checked={isBotEnabled}
                    onCheckedChange={(checked) => {
                      if (event.meetingId) {
                        toggleBotMutation.mutate({
                          meetingId: event.meetingId,
                          botExcluded: !checked,
                        });
                      } else {
                        createFromEventMutation.mutate({
                          event,
                          botExcluded: !checked,
                        });
                      }
                    }}
                    disabled={isPending}
                    className="scale-90 data-[state=checked]:bg-green-500"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">
                {isBotEnabled
                  ? "Bot will join - click to disable"
                  : event.meetingId
                    ? "Bot disabled - click to enable"
                    : "Enable bot for this meeting"}
              </TooltipContent>
            </Tooltip>

            {event.meeting_url && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(event.meeting_url, "_blank");
                    }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open meeting link</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEventGroup = (title: string, events: CalendarEvent[], showDivider = true) => {
    if (events.length === 0) return null;
    return (
      <div className={showDivider ? "pt-3 border-t border-gray-100 first:pt-0 first:border-0" : ""}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
        <div className="space-y-2">
          {events.map(renderEventCard)}
        </div>
      </div>
    );
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-violet-50/80 mb-6 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-md">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                    Upcoming Calendar Events
                    <Badge variant="secondary" className="text-xs bg-white/80 text-gray-600">
                      {eventsWithMeetingUrl.length} with video
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Toggle to enable/disable bot for each meeting
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              {isFetching && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Syncing
                </span>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="gap-1.5 text-xs h-8 hover:bg-white/50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                    Sync
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sync with Google Calendar</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-2">
            {isLoading ? (
              <div className="space-y-2">
                <EventCardSkeleton />
                <EventCardSkeleton />
              </div>
            ) : error || hasError ? (
              <div className="text-center py-6 text-sm text-gray-500">
                <p>Failed to load calendar events</p>
                {hasError && <p className="text-xs text-gray-400 mt-1">{hasError}</p>}
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
                  Try Again
                </Button>
              </div>
            ) : eventsWithMeetingUrl.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-gray-300" />
                </div>
                <p className="font-medium">No upcoming meetings with video links</p>
                <p className="text-xs text-gray-400 mt-1">
                  Events with Google Meet, Zoom, or Teams links will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {renderEventGroup("Today", groupedEvents.today, false)}
                {renderEventGroup("Tomorrow", groupedEvents.tomorrow)}
                {renderEventGroup("This Week", groupedEvents.thisWeek)}
                {renderEventGroup("Later", groupedEvents.later)}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
