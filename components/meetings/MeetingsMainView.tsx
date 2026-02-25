"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Video,
  Plus,
  Search,
  Settings2,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  CalendarDays,
  Sparkles,
  X,
  TrendingUp,
  Activity,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MeetingCard } from "./MeetingCard";
import { BotSettingsModal } from "./BotSettingsPanel";
import { CreateMeetingModal } from "./CreateMeetingModal";
import { CalendarEventsPreview } from "./CalendarEventsPreview";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Meeting {
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
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgGradient,
  onClick,
  isActive,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  bgGradient: string;
  onClick?: () => void;
  isActive?: boolean;
}) {
  return (
    <Card
      className={`border-0 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.02] ${
        isActive ? "ring-2 ring-violet-400 shadow-md" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${bgGradient}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MeetingCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function MeetingsMainView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Fetch ALL meetings for stats (unfiltered)
  const { data: allMeetingsData } = useQuery({
    queryKey: ["meetings-all"],
    queryFn: async () => {
      const res = await fetch("/api/meetings?limit=1000");
      if (!res.ok) throw new Error("Failed to fetch meetings");
      return res.json();
    },
    refetchInterval: (query) => {
      const meetings = query.state.data?.meetings || [];
      const hasInProgress = meetings.some((m: Meeting) =>
        ["JOINING", "IN_PROGRESS", "PROCESSING"].includes(m.status)
      );
      return hasInProgress ? 10000 : 30000; // 10s if in-progress, else 30s
    },
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  // Fetch filtered meetings for the list
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["meetings", activeTab, searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== "all") {
        params.set("filter", activeTab);
      }
      if (searchQuery) {
        params.set("search", searchQuery);
      }
      if (statusFilter) {
        params.set("status", statusFilter);
      }
      const res = await fetch(`/api/meetings?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch meetings");
      return res.json();
    },
    refetchInterval: (query) => {
      const meetings = query.state.data?.meetings || [];
      const hasInProgress = meetings.some((m: Meeting) =>
        ["JOINING", "IN_PROGRESS", "PROCESSING"].includes(m.status)
      );
      return hasInProgress ? 10000 : 30000;
    },
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  // Fetch calendar connection status from Composio
  const { data: calendarStatus } = useQuery({
    queryKey: ["composio-calendar-status"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/composio/status");
      if (!res.ok) throw new Error("Failed to fetch calendar status");
      return res.json();
    },
  });

  // Connect calendar mutation
  const connectCalendarMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/integrations/composio/connect?app=googlecalendar");
      if (!res.ok) throw new Error("Failed to get connect URL");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("Opening Google Calendar authorization...");
      }
    },
    onError: () => {
      toast.error("Failed to start calendar connection");
    },
  });

  // Join bot mutation
  const joinBotMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const res = await fetch(`/api/meetings/${meetingId}/join-bot`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to join meeting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetings-all"] });
      toast.success("Bot is joining the meeting");
    },
    onError: () => {
      toast.error("Failed to send bot");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete meeting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetings-all"] });
      toast.success("Meeting deleted");
    },
    onError: () => {
      toast.error("Failed to delete meeting");
    },
  });

  // Toggle bot mutation
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
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetings-all"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success(data.message);
    },
    onError: () => {
      toast.error("Failed to toggle bot setting");
    },
  });

  // Refresh status mutation (polls MeetingBaas API directly)
  const refreshStatusMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const res = await fetch(`/api/meetings/${meetingId}/refresh-status`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to refresh status");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetings-all"] });
      if (data.newStatus !== data.previousStatus) {
        toast.success(`Status updated: ${data.newStatus.replace("_", " ").toLowerCase()}`);
      } else {
        toast.info(`Status unchanged: ${data.botStatus}`);
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to refresh status");
    },
  });

  const meetings: Meeting[] = data?.meetings || [];

  // Stats - memoized, uses ALL meetings not filtered ones
  const stats = useMemo(() => {
    const allMeetings = allMeetingsData?.meetings || [];
    const now = Date.now();
    return {
      upcomingCount: allMeetings.filter(
        (m: Meeting) =>
          new Date(m.scheduledStart).getTime() >= now &&
          !["COMPLETED", "CANCELLED", "FAILED"].includes(m.status)
      ).length,
      completedCount: allMeetings.filter(
        (m: Meeting) => m.status === "COMPLETED"
      ).length,
      inProgressCount: allMeetings.filter((m: Meeting) =>
        ["JOINING", "IN_PROGRESS", "PROCESSING"].includes(m.status)
      ).length,
      withInsightsCount: allMeetings.filter(
        (m: Meeting) => (m._count?.insights || 0) > 0
      ).length,
      totalCount: allMeetings.length,
    };
  }, [allMeetingsData?.meetings]);

  const { upcomingCount, completedCount, inProgressCount, withInsightsCount } = stats;

  // Track which meetings we're currently polling to avoid duplicate requests
  const pollingRef = useRef<Set<string>>(new Set());

  // Auto-refresh status for meetings with bots that are in progress
  useEffect(() => {
    const allMeetings = allMeetingsData?.meetings || [];

    // Find meetings that need status polling from MeetingBaas
    const meetingsToRefresh = allMeetings.filter(
      (m: Meeting) =>
        m.botId &&
        ["JOINING", "IN_PROGRESS", "PROCESSING"].includes(m.status) &&
        !pollingRef.current.has(m.id)
    );

    if (meetingsToRefresh.length === 0) return;

    // Refresh each meeting's status
    const refreshMeetings = async () => {
      for (const meeting of meetingsToRefresh) {
        if (pollingRef.current.has(meeting.id)) continue;

        pollingRef.current.add(meeting.id);
        try {
          const res = await fetch(`/api/meetings/${meeting.id}/refresh-status`, {
            method: "POST",
          });
          if (res.ok) {
            const data = await res.json();
            if (data.newStatus !== data.previousStatus) {
              console.log(`[auto-refresh] Meeting ${meeting.id} status changed: ${data.previousStatus} -> ${data.newStatus}`);
              // Invalidate queries to refresh the UI
              queryClient.invalidateQueries({ queryKey: ["meetings"] });
              queryClient.invalidateQueries({ queryKey: ["meetings-all"] });
            }
          }
        } catch (error) {
          console.error(`[auto-refresh] Error refreshing meeting ${meeting.id}:`, error);
        } finally {
          pollingRef.current.delete(meeting.id);
        }
      }
    };

    // Initial refresh
    refreshMeetings();

    // Set up interval for continuous polling (every 30 seconds)
    const intervalId = setInterval(refreshMeetings, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [allMeetingsData?.meetings, queryClient]);

  // Handle sync complete
  const handleSyncComplete = useCallback((changes: number) => {
    if (changes > 0) {
      refetch();
    }
  }, [refetch]);

  // Handle stat card click
  const handleStatClick = (filter: string | null) => {
    if (filter === statusFilter) {
      setStatusFilter(null);
    } else {
      setStatusFilter(filter);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sticky Header Bar */}
        <div className="bg-white/95 backdrop-blur-md border-b border-gray-200/60 px-6 py-4 sticky top-0 z-10 flex-shrink-0 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/25">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
                <p className="text-sm text-gray-500">
                  AI-powered meeting notes and insights
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Sync Status */}
              <SyncStatusIndicator
                onSyncComplete={handleSyncComplete}
                autoSyncInterval={15000}
              />

              <div className="w-px h-6 bg-gray-200" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="gap-2"
              >
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Bot Settings</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25"
              >
                <Plus className="w-4 h-4" />
                Add Meeting
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-5">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={CalendarDays}
                label="Upcoming"
                value={upcomingCount}
                color="text-blue-600"
                bgGradient="bg-gradient-to-br from-blue-100 to-blue-50"
                onClick={() => {
                  setActiveTab("upcoming");
                  handleStatClick(null);
                }}
                isActive={activeTab === "upcoming" && !statusFilter}
              />
              <StatCard
                icon={Activity}
                label="In Progress"
                value={inProgressCount}
                color="text-emerald-600"
                bgGradient="bg-gradient-to-br from-emerald-100 to-emerald-50"
                onClick={() => handleStatClick("IN_PROGRESS")}
                isActive={statusFilter === "IN_PROGRESS"}
              />
              <StatCard
                icon={CheckCircle2}
                label="Completed"
                value={completedCount}
                color="text-violet-600"
                bgGradient="bg-gradient-to-br from-violet-100 to-violet-50"
                onClick={() => {
                  setActiveTab("past");
                  handleStatClick("COMPLETED");
                }}
                isActive={statusFilter === "COMPLETED"}
              />
              <StatCard
                icon={Sparkles}
                label="With Insights"
                value={withInsightsCount}
                color="text-amber-600"
                bgGradient="bg-gradient-to-br from-amber-100 to-amber-50"
                onClick={() => handleStatClick(null)}
                isActive={false}
              />
            </div>

            {/* Calendar Connection Banner */}
            {calendarStatus && !calendarStatus.googleCalendar && (
              <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-amber-900">
                          Connect your Google Calendar
                        </p>
                        <p className="text-sm text-amber-700">
                          Automatically sync meetings and let the bot join your calls
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={() => connectCalendarMutation.mutate()}
                      disabled={connectCalendarMutation.isPending}
                    >
                      {connectCalendarMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Calendar className="w-4 h-4 mr-2" />
                      )}
                      Connect Calendar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Calendar Events Preview */}
            {calendarStatus?.googleCalendar && (
              <CalendarEventsPreview
                onEventClick={(eventId, meetingId) => {
                  if (meetingId) {
                    router.push(`/meetings/${meetingId}`);
                  }
                }}
              />
            )}

            {/* Search and Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search meetings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-gray-200 focus:border-violet-400 focus:ring-violet-200"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setStatusFilter(null); }}>
                <TabsList className="bg-white border border-gray-200">
                  <TabsTrigger value="upcoming" className="gap-2 data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700">
                    <CalendarDays className="w-4 h-4" />
                    Upcoming
                  </TabsTrigger>
                  <TabsTrigger value="past" className="gap-2 data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700">
                    <Clock className="w-4 h-4" />
                    Past
                  </TabsTrigger>
                  <TabsTrigger value="all" className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700">
                    All
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {statusFilter && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-gray-200"
                  onClick={() => setStatusFilter(null)}
                >
                  Status: {statusFilter.replace("_", " ")}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
            </div>

            {/* Meetings List */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <MeetingCardSkeleton key={i} />
                  ))}
                </div>
              ) : error ? (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                    <CardTitle className="text-red-700 mb-2">
                      Failed to load meetings
                    </CardTitle>
                    <CardDescription className="text-red-600 mb-4">
                      There was an error loading your meetings. Please try again.
                    </CardDescription>
                    <Button variant="outline" onClick={() => refetch()}>
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              ) : meetings.length === 0 ? (
                <Card className="border-dashed border-2 border-gray-200 bg-white/50">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center">
                      <Video className="w-8 h-8 text-violet-500" />
                    </div>
                    <CardTitle className="text-gray-700 mb-2">
                      {statusFilter
                        ? `No ${statusFilter.toLowerCase().replace("_", " ")} meetings`
                        : searchQuery
                          ? "No meetings match your search"
                          : "No meetings found"}
                    </CardTitle>
                    <CardDescription className="mb-6">
                      {activeTab === "upcoming"
                        ? "You have no upcoming meetings scheduled"
                        : activeTab === "past"
                          ? "You have no past meetings recorded"
                          : "Add a meeting to get started with AI-powered notes"}
                    </CardDescription>
                    {!searchQuery && !statusFilter && (
                      <Button
                        onClick={() => setShowCreateModal(true)}
                        className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                      >
                        <Plus className="w-4 h-4" />
                        Add Your First Meeting
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {meetings.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      onClick={() => router.push(`/meetings/${meeting.id}`)}
                      onJoinBot={() => joinBotMutation.mutate(meeting.id)}
                      onToggleBot={(excluded) =>
                        toggleBotMutation.mutate({
                          meetingId: meeting.id,
                          botExcluded: excluded,
                        })
                      }
                      onDelete={() => deleteMutation.mutate(meeting.id)}
                      onRefreshStatus={() => refreshStatusMutation.mutate(meeting.id)}
                      isRefreshing={refreshStatusMutation.isPending && refreshStatusMutation.variables === meeting.id}
                      isSelected={false}
                    />
                  ))}
                </div>
              )}

              {/* Loading indicator for background refresh */}
              {isFetching && !isLoading && (
                <div className="flex items-center justify-center py-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Refreshing...
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Bot Settings Modal */}
      <BotSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Create Meeting Modal */}
      <CreateMeetingModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
