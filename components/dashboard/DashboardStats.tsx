"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckSquare,
  Link2,
  Mail,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { toast } from "sonner";

interface DashboardStatsData {
  stats: {
    totalConversations: number;
    messagesToday: number;
    unreadMessages: number;
    avgResponseTime: string;
    upcomingMeetings: number;
    activeTasks: number;
    connectedIntegrations: number;
  };
  trends: {
    conversations: { change: number; direction: "up" | "down" };
    messages: { change: number; direction: "up" | "down" };
    unread: { change: number; direction: "up" | "down" };
  };
  dailyVolume: Array<{ date: string; count: number }>;
  channelDistribution: Array<{ channel: string; count: number }>;
}

const CHANNEL_COLORS: Record<string, string> = {
  SMS: "#3b82f6",
  WHATSAPP: "#22c55e",
  EMAIL: "#ef4444",
  TWITTER: "#0ea5e9",
  FACEBOOK: "#6366f1",
  SLACK: "#e11d48",
  INSTAGRAM: "#ec4899",
  LINKEDIN: "#0A66C2",
};

// Mock data for immediate display while real data loads
const MOCK_DATA: DashboardStatsData = {
  stats: {
    totalConversations: 128,
    messagesToday: 24,
    unreadMessages: 7,
    avgResponseTime: "12m",
    upcomingMeetings: 3,
    activeTasks: 8,
    connectedIntegrations: 4,
  },
  trends: {
    conversations: { change: 12, direction: "up" },
    messages: { change: 8, direction: "up" },
    unread: { change: 3, direction: "down" },
  },
  dailyVolume: [
    { date: "Mon", count: 18 },
    { date: "Tue", count: 25 },
    { date: "Wed", count: 32 },
    { date: "Thu", count: 28 },
    { date: "Fri", count: 35 },
    { date: "Sat", count: 20 },
    { date: "Sun", count: 15 },
  ],
  channelDistribution: [
    { channel: "EMAIL", count: 45 },
    { channel: "WHATSAPP", count: 32 },
    { channel: "SLACK", count: 28 },
    { channel: "SMS", count: 15 },
    { channel: "INSTAGRAM", count: 8 },
  ],
};

export function DashboardStats() {
  // Fetch dashboard stats from consolidated API
  const { data: apiData, isLoading, error, refetch } = useQuery<DashboardStatsData>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }
      return res.json();
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 2,
  });

  // Check if API returned meaningful data (not all zeros/empty)
  const hasRealData = apiData && (
    (apiData.stats?.totalConversations ?? 0) > 0 ||
    (apiData.stats?.messagesToday ?? 0) > 0 ||
    (apiData.stats?.unreadMessages ?? 0) > 0 ||
    (apiData.dailyVolume?.length ?? 0) > 0 ||
    (apiData.channelDistribution?.length ?? 0) > 0
  );

  // Use mock data if loading OR if API returned empty/zero data
  const data = hasRealData ? apiData : MOCK_DATA;
  const showingMockData = isLoading || !hasRealData;

  // Show error toast on failure (only once per error)
  useEffect(() => {
    if (error) {
      toast.error("Failed to load dashboard stats", { id: "dashboard-stats-error" });
    }
  }, [error]);

  // Use data (real or mock)
  const stats = data?.stats;
  const trends = data?.trends;

  const statCards = [
    {
      title: "Total Conversations",
      value: stats?.totalConversations || 0,
      change: `${trends?.conversations?.direction === "up" ? "+" : "-"}${trends?.conversations?.change || 0}%`,
      trend: trends?.conversations?.direction || "up",
      icon: MessageSquare,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Messages Today",
      value: stats?.messagesToday || 0,
      change: `${trends?.messages?.direction === "up" ? "+" : "-"}${trends?.messages?.change || 0}%`,
      trend: trends?.messages?.direction || "up",
      icon: Mail,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Unread Messages",
      value: stats?.unreadMessages || 0,
      change: stats?.unreadMessages ? `${stats.unreadMessages} pending` : "All read",
      trend: (stats?.unreadMessages || 0) > 0 ? "up" : "down",
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Avg Response Time",
      value: stats?.avgResponseTime || "0m",
      change: "This week",
      trend: "down",
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Upcoming Meetings",
      value: stats?.upcomingMeetings || 0,
      change: "Scheduled",
      trend: "up",
      icon: Calendar,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Active Tasks",
      value: stats?.activeTasks || 0,
      change: "In progress",
      trend: "up",
      icon: CheckSquare,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
  ];

  // Error state (only show if we have an error AND no placeholder data)
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="bg-red-50 rounded-full p-4 mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load dashboard</h3>
        <p className="text-gray-500 text-sm mb-4">There was an error fetching your dashboard data</p>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo data indicator */}
      {showingMockData && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
            <span className="text-blue-600 font-medium">
              {isLoading ? "Loading your data..." : "Showing demo data"}
            </span>
          </div>
        </div>
      )}

      {/* Stats Grid - 6 Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 ${showingMockData ? 'opacity-90' : ''} transition-opacity duration-300`}>
        {statCards.map((stat, index) => (
          <Card
            key={index}
            className="hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border-gray-200/50"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="flex items-center gap-1 text-xs">
                {stat.title !== "Avg Response Time" &&
                stat.title !== "Upcoming Meetings" &&
                stat.title !== "Active Tasks" ? (
                  <>
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="w-3 h-3 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 text-red-600" />
                    )}
                    <span
                      className={
                        stat.trend === "up" ? "text-green-600" : "text-red-600"
                      }
                    >
                      {stat.change}
                    </span>
                    {stat.title !== "Unread Messages" && (
                      <span className="text-gray-400">vs last week</span>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400">{stat.change}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mini Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Volume Sparkline */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-700">
                Message Volume (7 Days)
              </CardTitle>
              <Link2 className="w-4 h-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            {data?.dailyVolume && data.dailyVolume.length > 0 ? (
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={data.dailyVolume}>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-xs text-gray-500">
                              {payload[0].payload.date}
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {payload[0].value} messages
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "#3b82f6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[100px] flex items-center justify-center text-gray-400 text-sm">
                No message data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Channel Distribution Pie */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Messages by Channel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.channelDistribution && data.channelDistribution.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie
                      data={data.channelDistribution}
                      dataKey="count"
                      nameKey="channel"
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                      paddingAngle={2}
                    >
                      {data.channelDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHANNEL_COLORS[entry.channel] || "#9ca3af"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
                              <p className="text-xs font-medium text-gray-900">
                                {payload[0].name}
                              </p>
                              <p className="text-sm font-semibold">
                                {payload[0].value} messages
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {data.channelDistribution.slice(0, 6).map((channel) => (
                    <div key={channel.channel} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            CHANNEL_COLORS[channel.channel] || "#9ca3af",
                        }}
                      />
                      <span className="text-xs text-gray-600">
                        {channel.channel}
                      </span>
                      <span className="text-xs font-medium text-gray-900">
                        {channel.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[100px] flex items-center justify-center text-gray-400 text-sm">
                No channel data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
