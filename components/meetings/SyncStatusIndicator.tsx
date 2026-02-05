"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  RefreshCw,
  Check,
  AlertCircle,
  Wifi,
  WifiOff,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

type SyncStatus = "idle" | "syncing" | "success" | "error";

interface SyncResult {
  created: number;
  updated: number;
  cancelled: number;
}

interface SyncStatusIndicatorProps {
  onSyncComplete?: (changes: number) => void;
  autoSyncInterval?: number; // in milliseconds, 0 to disable
}

export function SyncStatusIndicator({
  onSyncComplete,
  autoSyncInterval = 15000, // 15 seconds default
}: SyncStatusIndicatorProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch last sync time on mount
  const { data: syncStatus } = useQuery({
    queryKey: ["sync-status"],
    queryFn: async () => {
      const res = await fetch("/api/meetings/sync");
      if (!res.ok) throw new Error("Failed to get sync status");
      return res.json();
    },
    staleTime: 60000,
  });

  useEffect(() => {
    if (syncStatus?.lastSyncTime) {
      setLastSyncTime(new Date(syncStatus.lastSyncTime));
    }
  }, [syncStatus]);

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/meetings/sync", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onMutate: () => {
      setStatus("syncing");
    },
    onSuccess: (data) => {
      setStatus("success");
      setLastSyncTime(new Date());

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetings-all"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });

      const result = data.result as SyncResult;
      const totalChanges = (result?.created || 0) + (result?.updated || 0) + (result?.cancelled || 0);

      if (totalChanges > 0) {
        const messages = [];
        if (result.created > 0) messages.push(`${result.created} new`);
        if (result.updated > 0) messages.push(`${result.updated} updated`);
        if (result.cancelled > 0) messages.push(`${result.cancelled} cancelled`);
        toast.success(`Synced: ${messages.join(", ")}`);
      }

      onSyncComplete?.(totalChanges);

      // Reset status after 3 seconds
      setTimeout(() => setStatus("idle"), 3000);
    },
    onError: (error) => {
      setStatus("error");
      toast.error(error instanceof Error ? error.message : "Sync failed");
      setTimeout(() => setStatus("idle"), 5000);
    },
  });

  // Auto-sync with visibility check
  useEffect(() => {
    if (autoSyncInterval <= 0 || !isOnline) return;

    let intervalId: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !syncMutation.isPending) {
        // Sync when user returns to tab
        syncMutation.mutate();
      }
    };

    // Start interval
    intervalId = setInterval(() => {
      if (document.visibilityState === "visible" && !syncMutation.isPending) {
        syncMutation.mutate();
      }
    }, autoSyncInterval);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoSyncInterval, isOnline, syncMutation]);

  const handleManualSync = () => {
    if (!syncMutation.isPending) {
      syncMutation.mutate();
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
    switch (status) {
      case "syncing":
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case "success":
        return <Check className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Wifi className="w-4 h-4 text-green-500" />;
    }
  };

  const getStatusText = () => {
    if (!isOnline) return "Offline";
    switch (status) {
      case "syncing":
        return "Syncing...";
      case "success":
        return "Synced";
      case "error":
        return "Sync failed";
      default:
        return lastSyncTime
          ? `Synced ${formatDistanceToNow(lastSyncTime, { addSuffix: true })}`
          : "Not synced";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            {getStatusIcon()}
            <span className="hidden sm:inline">{getStatusText()}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-medium">{getStatusText()}</p>
            {lastSyncTime && (
              <p className="text-gray-400 flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                Last sync: {lastSyncTime.toLocaleTimeString()}
              </p>
            )}
            {autoSyncInterval > 0 && isOnline && (
              <p className="text-gray-400 mt-1">
                Auto-syncing every {Math.round(autoSyncInterval / 1000)}s
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleManualSync}
            disabled={syncMutation.isPending || !isOnline}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Sync now</TooltipContent>
      </Tooltip>
    </div>
  );
}
