"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Users,
  TrendingUp,
  Settings,
  Mail,
  Phone,
  ArrowRight,
  Inbox,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RecentConversation {
  id: string;
  name: string;
  email?: string;
  lastMessage: string;
  channel: string;
  direction: "INBOUND" | "OUTBOUND";
  lastMessageAt: string;
}

interface DashboardData {
  recentConversations: RecentConversation[];
}

// Channel icon colors
const CHANNEL_COLORS: Record<string, { bg: string; text: string }> = {
  SMS: { bg: "bg-blue-100", text: "text-blue-600" },
  WHATSAPP: { bg: "bg-green-100", text: "text-green-600" },
  EMAIL: { bg: "bg-red-100", text: "text-red-600" },
  TWITTER: { bg: "bg-sky-100", text: "text-sky-600" },
  FACEBOOK: { bg: "bg-indigo-100", text: "text-indigo-600" },
  SLACK: { bg: "bg-rose-100", text: "text-rose-600" },
  INSTAGRAM: { bg: "bg-pink-100", text: "text-pink-600" },
  LINKEDIN: { bg: "bg-blue-100", text: "text-blue-600" },
};

// Mock data for immediate display
const MOCK_CONVERSATIONS: RecentConversation[] = [
  {
    id: "mock-1",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    lastMessage: "Thanks for the quick response! I'll review the proposal and get back to you.",
    channel: "EMAIL",
    direction: "INBOUND",
    lastMessageAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
  },
  {
    id: "mock-2",
    name: "Michael Chen",
    email: "michael@techcorp.com",
    lastMessage: "Can we schedule a call for tomorrow afternoon?",
    channel: "SLACK",
    direction: "INBOUND",
    lastMessageAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
  },
  {
    id: "mock-3",
    name: "Emily Davis",
    email: "emily@startup.io",
    lastMessage: "The demo went great! Looking forward to next steps.",
    channel: "WHATSAPP",
    direction: "OUTBOUND",
    lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: "mock-4",
    name: "James Wilson",
    email: "james@agency.com",
    lastMessage: "Please find the updated contract attached.",
    channel: "EMAIL",
    direction: "INBOUND",
    lastMessageAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
  },
  {
    id: "mock-5",
    name: "Lisa Thompson",
    email: "lisa@enterprise.com",
    lastMessage: "Great working with you on this project!",
    channel: "SLACK",
    direction: "OUTBOUND",
    lastMessageAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
  },
];

const MOCK_DATA: DashboardData = {
  recentConversations: MOCK_CONVERSATIONS,
};

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function DashboardActivity() {
  const { data: session } = useSession();
  const router = useRouter();

  // Fetch recent conversations from dashboard API
  const { data: apiData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 30000,
    retry: 2,
  });

  // Check if API returned meaningful data
  const hasRealData = apiData && (apiData.recentConversations?.length ?? 0) > 0;

  // Use mock data if loading OR if API returned empty data
  const data = hasRealData ? apiData : MOCK_DATA;
  const showingMockData = isLoading || !hasRealData;

  const recentConversations = data?.recentConversations || [];

  const handleConversationClick = (contactId: string) => {
    router.push(`/inbox?contact=${contactId}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Conversations */}
      <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Recent Conversations
                </CardTitle>
                {showingMockData && (
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-600">
                    Demo
                  </span>
                )}
              </div>
              <CardDescription className="text-sm text-gray-500">
                Your latest message threads
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/inbox")}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentConversations.length > 0 ? (
            <div className={`space-y-2 ${showingMockData ? 'opacity-90' : ''} transition-opacity duration-300`}>
              {recentConversations.map((conversation) => {
                const channelStyle = CHANNEL_COLORS[conversation.channel] || {
                  bg: "bg-gray-100",
                  text: "text-gray-600",
                };
                const initials = conversation.name
                  ? conversation.name.charAt(0).toUpperCase()
                  : conversation.email
                    ? conversation.email.charAt(0).toUpperCase()
                    : "?";

                return (
                  <div
                    key={conversation.id}
                    onClick={() => handleConversationClick(conversation.id)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer group border border-transparent hover:border-gray-200"
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                      {initials}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">
                          {conversation.name || conversation.email || "Unknown"}
                        </p>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${channelStyle.bg} ${channelStyle.text}`}
                        >
                          {conversation.channel}
                        </span>
                        {conversation.direction === "INBOUND" && (
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.direction === "OUTBOUND" && (
                          <span className="text-gray-400">You: </span>
                        )}
                        {conversation.lastMessage}
                      </p>
                    </div>

                    {/* Time */}
                    <div className="text-right shrink-0">
                      <span className="text-xs text-gray-400">
                        {formatRelativeTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Inbox className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No conversations yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Start chatting to see your conversations here
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/inbox")}
                className="mt-4"
              >
                Go to Inbox
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Quick Actions
          </CardTitle>
          <CardDescription className="text-sm text-gray-500">
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "New Message",
                description: "Start a conversation",
                icon: MessageSquare,
                color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
                iconBg: "bg-blue-100",
                onClick: () => router.push("/inbox"),
              },
              {
                label: "Add Contact",
                description: "Create new contact",
                icon: Users,
                color: "bg-green-50 text-green-600 hover:bg-green-100",
                iconBg: "bg-green-100",
                onClick: () => router.push("/contacts"),
              },
              {
                label: "View Analytics",
                description: "See insights",
                icon: TrendingUp,
                color: "bg-purple-50 text-purple-600 hover:bg-purple-100",
                iconBg: "bg-purple-100",
                onClick: () => router.push("/analytics"),
              },
              {
                label: "Settings",
                description: "Manage account",
                icon: Settings,
                color: "bg-gray-50 text-gray-600 hover:bg-gray-100",
                iconBg: "bg-gray-200",
                onClick: () => router.push("/settings"),
              },
            ].map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={`p-4 rounded-xl ${action.color} transition-all duration-200 text-left shadow-sm hover:shadow-md group cursor-pointer`}
              >
                <div
                  className={`w-10 h-10 rounded-lg ${action.iconBg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}
                >
                  <action.icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold">{action.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{action.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
