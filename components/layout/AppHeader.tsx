"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Bell, User, LogOut, Settings, HelpCircle, Search, CheckCheck } from "lucide-react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const handleOpenSearch = () => {
    // Dispatch custom event to open command palette
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  // Fetch notifications
  const { data: notificationsData } = useQuery({
    queryKey: ["notifications", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: !!session?.user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-transparent px-6">
      {/* Left: App / page label (subtle, like Notion) */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="font-semibold text-gray-900">AYA AI</span>
        <span className="text-gray-300">/</span>
        <span>Workspace</span>
      </div>

      {/* Right: search shortcut + notifications + avatar */}
      <div className="flex items-center gap-2">
        {/* Search Shortcut Button */}
        <button
          onClick={handleOpenSearch}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-lg transition-all duration-200 border border-gray-200/50 hover:border-gray-300 bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-md"
          title="Search (Ctrl+K or Ctrl+/)"
        >
          <Search className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400 hidden lg:inline">Search</span>
          <KbdGroup className="ml-1">
            <Kbd className="text-[10px] px-1.5 py-0.5">Ctrl</Kbd>
            <Kbd className="text-[10px] px-1.5 py-0.5">K</Kbd>
          </KbdGroup>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-[500px] overflow-y-auto bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-sm text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-blue-600 hover:text-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllAsReadMutation.mutate();
                  }}
                  disabled={markAllAsReadMutation.isPending}
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification: any) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      "flex flex-col items-start gap-1 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0",
                      !notification.read && "bg-blue-50/50"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between w-full gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium text-gray-900",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-1" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No notifications</p>
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "U"}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{session?.user?.name || "User"}</p>
              <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
              <User className="w-4 h-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings/organization")}>
              <Settings className="w-4 h-4 mr-2 " />
              Organization
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/help")} className="cursor-pointer">
              <HelpCircle className="w-4 h-4 mr-2 " />
              Help & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

