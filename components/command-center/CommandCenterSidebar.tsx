// components/command-center/CommandCenterSidebar.tsx

"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useCommandCenter } from "./CommandCenterProvider";
import { SignalCard } from "./SignalCard";
import { SpaceGroup } from "./SpaceGroup";
import { CelebrationState } from "./CelebrationState";
import { cn } from "@/lib/utils";
import { Signal } from "@/lib/command-center/types";
import { useRouter } from "next/navigation";
import {
  Radio,
  RefreshCw,
  Filter,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

export function CommandCenterSidebar() {
  const router = useRouter();
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const {
    signals,
    summary,
    velocityTrend,
    isLoading,
    isExpanded,
    setIsExpanded,
    selectedSpaceId,
    setSelectedSpaceId,
    refetch,
    hasOpenPopover,
  } = useCommandCenter();

  // Only collapse if no dropdown/popover is open
  const handleMouseLeave = useCallback(() => {
    if (!isSelectOpen && !hasOpenPopover) {
      setIsExpanded(false);
    }
  }, [isSelectOpen, hasOpenPopover, setIsExpanded]);

  // Fetch spaces for filter dropdown
  const { data: spacesData } = useQuery({
    queryKey: ["spaces-list"],
    queryFn: async () => {
      const res = await fetch("/api/crm/spaces");
      if (!res.ok) throw new Error("Failed to fetch spaces");
      return res.json();
    },
  });

  const spaces = spacesData?.spaces || [];

  // Group signals by space
  const groupedSignals = useMemo(() => {
    const groups = new Map<string, Signal[]>();
    const noSpace: Signal[] = [];

    for (const signal of signals) {
      if (signal.spaceName) {
        const existing = groups.get(signal.spaceName) || [];
        existing.push(signal);
        groups.set(signal.spaceName, existing);
      } else {
        noSpace.push(signal);
      }
    }

    return { groups, noSpace };
  }, [signals]);

  // Separate shipped from attention signals
  const attentionSignals = signals.filter((s) => s.type !== "shipped");
  const shippedSignals = signals.filter((s) => s.type === "shipped");

  const handleNavigate = (signal: Signal) => {
    if (signal.entityType === "task") {
      router.push(`/crm?task=${signal.entityId}`);
    } else if (signal.entityType === "contact") {
      router.push(`/inbox?contact=${signal.entityId}`);
    }
  };

  return (
    <>
      {/* Collapsed State - Icon with Badge */}
      <div
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 z-40 transition-all duration-300",
          isExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        onMouseEnter={() => setIsExpanded(true)}
      >
        <div className="bg-white border border-gray-200 rounded-l-lg shadow-lg p-2 cursor-pointer hover:bg-gray-50">
          <div className="relative">
            <Radio className="w-5 h-5 text-gray-600" />
            {summary && summary.total > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {summary.total > 99 ? "99+" : summary.total}
              </span>
            )}
            {summary && summary.total === 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 rounded-full w-3 h-3" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Sidebar */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-xl z-50",
          "transition-transform duration-300 ease-in-out",
          isExpanded ? "translate-x-0" : "translate-x-full"
        )}
        onMouseLeave={handleMouseLeave}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Command Center</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
              title="Refresh"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="p-3 border-b border-gray-100">
          <Select
            value={selectedSpaceId || "all"}
            onValueChange={(v) => setSelectedSpaceId(v === "all" ? null : v)}
            onOpenChange={setIsSelectOpen}
          >
            <SelectTrigger className="w-full h-9">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <SelectValue placeholder="All Spaces" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Spaces</SelectItem>
              {spaces.map((space: any) => (
                <SelectItem key={space.id} value={space.id}>
                  {space.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Velocity Trend */}
        {velocityTrend && velocityTrend.lastWeek > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">This week</span>
              <span className="font-medium">
                {velocityTrend.thisWeek} tasks shipped
                <span
                  className={cn(
                    "ml-2 text-xs",
                    velocityTrend.percentChange >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {velocityTrend.percentChange >= 0 ? "+" : ""}
                  {velocityTrend.percentChange}%
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ height: "calc(100% - 160px)" }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : attentionSignals.length === 0 ? (
            <CelebrationState shippedSignals={shippedSignals} />
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Ungrouped signals (communication gaps, bottlenecks) */}
              {groupedSignals.noSpace.length > 0 && (
                <div className="pb-2">
                  {groupedSignals.noSpace.map((signal) => (
                    <SignalCard
                      key={signal.id}
                      signal={signal}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              )}

              {/* Grouped by space */}
              {Array.from(groupedSignals.groups.entries()).map(([spaceName, spaceSignals]) => (
                <SpaceGroup
                  key={spaceName}
                  spaceName={spaceName}
                  signals={spaceSignals}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
