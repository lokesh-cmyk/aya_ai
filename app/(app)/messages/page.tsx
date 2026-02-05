"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  Filter,
  Search,
  X,
  Mail,
  MessageCircle,
  Phone,
  Slack,
  Instagram,
  Twitter,
  Facebook,
} from "lucide-react";

const CHANNELS = [
  { id: "EMAIL", label: "Email", icon: Mail },
  { id: "SMS", label: "SMS", icon: Phone },
  { id: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { id: "SLACK", label: "Slack", icon: Slack },
  { id: "INSTAGRAM", label: "Instagram", icon: Instagram },
  { id: "TWITTER", label: "Twitter", icon: Twitter },
  { id: "FACEBOOK", label: "Facebook", icon: Facebook },
];

const STATUSES = [
  { id: "SENT", label: "Sent", color: "bg-blue-100 text-blue-700" },
  { id: "DELIVERED", label: "Delivered", color: "bg-green-100 text-green-700" },
  { id: "READ", label: "Read", color: "bg-purple-100 text-purple-700" },
  { id: "FAILED", label: "Failed", color: "bg-red-100 text-red-700" },
  { id: "SCHEDULED", label: "Scheduled", color: "bg-yellow-100 text-yellow-700" },
];

export default function MessagesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Build query params based on filters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (searchQuery) params.set("search", searchQuery);
    // Note: API currently only supports single channel filter
    // We'll filter client-side for multiple channels
    return params.toString();
  }, [searchQuery]);

  const { data: messagesData, isLoading, refetch } = useQuery({
    queryKey: ["messages", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/messages?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    staleTime: 30000,
  });

  // Client-side filtering for channels and statuses
  const filteredMessages = useMemo(() => {
    let messages = messagesData?.messages || [];

    if (selectedChannels.length > 0) {
      messages = messages.filter((msg: any) =>
        selectedChannels.includes(msg.channel)
      );
    }

    if (selectedStatuses.length > 0) {
      messages = messages.filter((msg: any) =>
        selectedStatuses.includes(msg.status)
      );
    }

    return messages;
  }, [messagesData?.messages, selectedChannels, selectedStatuses]);

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((c) => c !== channelId)
        : [...prev, channelId]
    );
  };

  const toggleStatus = (statusId: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(statusId)
        ? prev.filter((s) => s !== statusId)
        : [...prev, statusId]
    );
  };

  const clearFilters = () => {
    setSelectedChannels([]);
    setSelectedStatuses([]);
    setSearchQuery("");
  };

  const hasActiveFilters =
    selectedChannels.length > 0 || selectedStatuses.length > 0 || searchQuery;

  const getChannelIcon = (channel: string) => {
    const channelData = CHANNELS.find((c) => c.id === channel);
    if (channelData) {
      const Icon = channelData.icon;
      return <Icon className="w-3 h-3" />;
    }
    return <MessageSquare className="w-3 h-3" />;
  };

  const getStatusColor = (status: string) => {
    const statusData = STATUSES.find((s) => s.id === status);
    return statusData?.color || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">
            View and manage all your messages across channels,
            <br />
            Communications done with Added Contacts appear here.
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filter
              {hasActiveFilters && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {selectedChannels.length + selectedStatuses.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Channels</DropdownMenuLabel>
            {CHANNELS.map((channel) => {
              const Icon = channel.icon;
              return (
                <DropdownMenuCheckboxItem
                  key={channel.id}
                  checked={selectedChannels.includes(channel.id)}
                  onCheckedChange={() => toggleChannel(channel.id)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {channel.label}
                </DropdownMenuCheckboxItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            {STATUSES.map((status) => (
              <DropdownMenuCheckboxItem
                key={status.id}
                checked={selectedStatuses.includes(status.id)}
                onCheckedChange={() => toggleStatus(status.id)}
              >
                <span
                  className={`w-2 h-2 rounded-full mr-2 ${status.color.split(" ")[0]}`}
                />
                {status.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedChannels.map((channelId) => {
            const channel = CHANNELS.find((c) => c.id === channelId);
            return (
              <Badge
                key={channelId}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-gray-200"
                onClick={() => toggleChannel(channelId)}
              >
                {channel?.label}
                <X className="w-3 h-3" />
              </Badge>
            );
          })}
          {selectedStatuses.map((statusId) => {
            const status = STATUSES.find((s) => s.id === statusId);
            return (
              <Badge
                key={statusId}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-gray-200"
                onClick={() => toggleStatus(statusId)}
              >
                {status?.label}
                <X className="w-3 h-3" />
              </Badge>
            );
          })}
        </div>
      )}

      {/* Messages List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredMessages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-2">
              {hasActiveFilters ? "No messages match your filters" : "No messages yet"}
            </p>
            <p className="text-sm text-gray-400">
              {hasActiveFilters
                ? "Try adjusting your filters"
                : "Messages from your integrated channels will appear here"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMessages.map((message: any) => (
            <Card key={message.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                    {message.contact?.name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900">
                        {message.contact?.name || "Unknown"}
                      </p>
                      <span className="text-xs text-gray-500">
                        {new Date(message.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {message.content}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                        {getChannelIcon(message.channel)}
                        {message.channel}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                        {message.direction}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(message.status)}`}
                      >
                        {message.status}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results count */}
      {!isLoading && filteredMessages.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          Showing {filteredMessages.length} message{filteredMessages.length !== 1 ? "s" : ""}
          {messagesData?.pagination?.total > filteredMessages.length && (
            <> of {messagesData.pagination.total} total</>
          )}
        </p>
      )}
    </div>
  );
}
