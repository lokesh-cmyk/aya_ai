// app/(app)/command-center/page.tsx

"use client";

import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CommandCenterResponse, Signal, SignalType } from "@/lib/command-center/types";
import { cn } from "@/lib/utils";
import {
  Radio,
  RefreshCw,
  Filter,
  ChevronLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  User,
  MessageSquare,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  BellOff,
  Sparkles,
  Zap,
  Target,
  Calendar,
  ArrowRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const signalConfig: Record<SignalType, {
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  gradient: string;
  label: string;
  description: string;
}> = {
  shipped: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    gradient: "from-emerald-500 to-green-600",
    label: "Shipped",
    description: "Recently completed"
  },
  stale: {
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    gradient: "from-amber-500 to-yellow-600",
    label: "Stale",
    description: "No recent progress"
  },
  blocked: {
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    gradient: "from-red-500 to-rose-600",
    label: "Blocked",
    description: "Needs resolution"
  },
  overdue: {
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    gradient: "from-red-500 to-orange-600",
    label: "Overdue",
    description: "Past due date"
  },
  bottleneck: {
    icon: User,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    gradient: "from-orange-500 to-amber-600",
    label: "Bottleneck",
    description: "Multiple blockers"
  },
  comm_gap: {
    icon: MessageSquare,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    gradient: "from-blue-500 to-indigo-600",
    label: "Comm Gap",
    description: "Awaiting response"
  },
  velocity: {
    icon: TrendingDown,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    gradient: "from-purple-500 to-violet-600",
    label: "Velocity",
    description: "Trend change"
  },
};

export default function CommandCenterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedSpaceId, setSelectedSpaceId] = React.useState<string | null>(null);
  const [expandedSpaces, setExpandedSpaces] = React.useState<Set<string>>(new Set());
  const [selectedSignal, setSelectedSignal] = React.useState<Signal | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const { data, isLoading, refetch } = useQuery<CommandCenterResponse>({
    queryKey: ["command-center-mobile", selectedSpaceId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSpaceId) params.set("spaceId", selectedSpaceId);
      const res = await fetch(`/api/command-center/signals?${params}`);
      if (!res.ok) throw new Error("Failed to fetch signals");
      return res.json();
    },
  });

  const { data: spacesData } = useQuery({
    queryKey: ["spaces-list"],
    queryFn: async () => {
      const res = await fetch("/api/crm/spaces");
      if (!res.ok) throw new Error("Failed to fetch spaces");
      return res.json();
    },
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["signal-summary-mobile", selectedSignal?.id],
    queryFn: async () => {
      if (!selectedSignal) return null;
      const res = await fetch(`/api/command-center/summary/${encodeURIComponent(selectedSignal.id)}`);
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
    enabled: !!selectedSignal && sheetOpen,
  });

  const dismissMutation = useMutation({
    mutationFn: async ({ signalKey, type, snoozeDays }: any) => {
      const res = await fetch("/api/command-center/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalKey, type, snoozeDays }),
      });
      if (!res.ok) throw new Error("Failed to dismiss");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command-center-mobile"] });
      setSelectedSignal(null);
      setSheetOpen(false);
    },
  });

  const spaces = spacesData?.spaces || [];
  const signals = data?.signals || [];

  // Auto-expand all spaces on initial load
  React.useEffect(() => {
    if (signals.length > 0 && expandedSpaces.size === 0) {
      const allSpaceNames = new Set(signals.map(s => s.spaceName || "Other"));
      setExpandedSpaces(allSpaceNames);
    }
  }, [signals, expandedSpaces.size]);

  const groupedSignals = useMemo(() => {
    const groups = new Map<string, Signal[]>();
    for (const signal of signals) {
      const key = signal.spaceName || "Other";
      const existing = groups.get(key) || [];
      existing.push(signal);
      groups.set(key, existing);
    }
    return groups;
  }, [signals]);

  const toggleSpace = (spaceName: string) => {
    const newSet = new Set(expandedSpaces);
    if (newSet.has(spaceName)) {
      newSet.delete(spaceName);
    } else {
      newSet.add(spaceName);
    }
    setExpandedSpaces(newSet);
  };

  const handleNavigate = (signal: Signal) => {
    setSheetOpen(false);
    if (signal.entityType === "task") {
      router.push(`/crm?task=${signal.entityId}`);
    } else if (signal.entityType === "contact") {
      router.push(`/inbox?contact=${signal.entityId}`);
    }
  };

  const attentionSignals = signals.filter((s) => s.type !== "shipped");
  const shippedSignals = signals.filter((s) => s.type === "shipped");

  // Count by severity
  //just to push the changes!
  const criticalCount = signals.filter(s => s.severity === "critical").length;
  const warningCount = signals.filter(s => s.severity === "warning").length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header with Gradient */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="bg-blue-500 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-white/20">
                  <Radio className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Command Center</h1>
                  <p className="text-xs text-white/70">Your activity radar</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <RefreshCw className={cn("w-5 h-5 text-white", isLoading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {!isLoading && attentionSignals.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 border-b border-slate-100">
            {criticalCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium text-red-700">{criticalCount} Critical</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm font-medium text-amber-700">{warningCount} Warning</span>
              </div>
            )}
            {shippedSignals.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-emerald-700">{shippedSignals.length} Shipped</span>
              </div>
            )}
          </div>
        )}

        {/* Filter */}
        <div className="px-4 py-3">
          <Select
            value={selectedSpaceId || "all"}
            onValueChange={(v) => setSelectedSpaceId(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-full bg-white border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
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
      </div>

      {/* Content */}
      <div className="p-4 pb-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-60 gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
              <Radio className="w-5 h-5 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-sm text-slate-500">Scanning for signals...</p>
          </div>
        ) : attentionSignals.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
            <div className="relative mx-auto w-20 h-20 mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full opacity-20 animate-pulse" />
              <div className="absolute inset-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">All Clear!</h2>
            <p className="text-slate-500 mb-6">No blocked, stale, or overdue items.<br/>Your team is executing well.</p>

            {shippedSignals.length > 0 && (
              <div className="border-t border-slate-100 pt-6 mt-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <p className="text-sm font-semibold text-slate-700">Recently Shipped</p>
                </div>
                <div className="space-y-2">
                  {shippedSignals.slice(0, 5).map((signal) => (
                    <div key={signal.id} className="flex items-center gap-2 text-sm text-slate-600 justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="truncate max-w-[200px]">{signal.title.replace('" shipped', '"')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(groupedSignals.entries()).map(([spaceName, spaceSignals]) => {
              const spaceCritical = spaceSignals.filter(s => s.severity === "critical").length;
              const spaceWarning = spaceSignals.filter(s => s.severity === "warning").length;

              return (
                <div
                  key={spaceName}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100"
                >
                  {/* Space Header */}
                  <button
                    onClick={() => toggleSpace(spaceName)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        spaceCritical > 0
                          ? "bg-gradient-to-br from-red-500 to-rose-600"
                          : spaceWarning > 0
                            ? "bg-gradient-to-br from-amber-500 to-yellow-600"
                            : "bg-gradient-to-br from-emerald-500 to-green-600"
                      )}>
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-900">{spaceName}</p>
                        <p className="text-xs text-slate-500">
                          {spaceCritical > 0 && <span className="text-red-600">{spaceCritical} critical</span>}
                          {spaceCritical > 0 && spaceWarning > 0 && " · "}
                          {spaceWarning > 0 && <span className="text-amber-600">{spaceWarning} warning</span>}
                          {spaceCritical === 0 && spaceWarning === 0 && <span className="text-emerald-600">All good</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-bold px-3 py-1 rounded-full",
                        spaceCritical > 0
                          ? "bg-red-100 text-red-700"
                          : spaceWarning > 0
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                      )}>
                        {spaceSignals.length}
                      </span>
                      {expandedSpaces.has(spaceName) ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Signals List */}
                  {expandedSpaces.has(spaceName) && (
                    <div className="border-t border-slate-100">
                      {spaceSignals.map((signal, index) => {
                        const config = signalConfig[signal.type];
                        const Icon = config.icon;

                        return (
                          <Sheet
                            key={signal.id}
                            open={sheetOpen && selectedSignal?.id === signal.id}
                            onOpenChange={(open) => {
                              setSheetOpen(open);
                              if (!open) setSelectedSignal(null);
                            }}
                          >
                            <SheetTrigger asChild>
                              <div
                                className={cn(
                                  "flex items-center gap-3 p-4 cursor-pointer transition-colors",
                                  "hover:bg-slate-50 active:bg-slate-100",
                                  index !== spaceSignals.length - 1 && "border-b border-slate-50"
                                )}
                                onClick={() => {
                                  setSelectedSignal(signal);
                                  setSheetOpen(true);
                                }}
                              >
                                {/* Signal Icon */}
                                <div className={cn(
                                  "w-11 h-11 rounded-xl flex items-center justify-center border-2",
                                  config.bg,
                                  config.border
                                )}>
                                  <Icon className={cn("w-5 h-5", config.color)} />
                                </div>

                                {/* Signal Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className={cn(
                                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                      config.bg,
                                      config.color
                                    )}>
                                      {config.label}
                                    </span>
                                  </div>
                                  <p className="font-medium text-slate-900 truncate text-sm">
                                    {signal.title}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate">
                                    {signal.subtitle}
                                  </p>
                                </div>

                                {/* Arrow */}
                                <ArrowRight className="w-4 h-4 text-slate-300" />
                              </div>
                            </SheetTrigger>

                            {/* Bottom Sheet */}
                            <SheetContent
                              side="bottom"
                              className="rounded-t-3xl px-0 pb-8 max-h-[85vh] overflow-auto"
                            >
                              {/* Sheet Header with Gradient */}
                              <div className={cn(
                                "px-6 pt-6 pb-4 bg-gradient-to-r",
                                config.gradient
                              )}>
                                <div className="flex items-start gap-4">
                                  <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                                    <Icon className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                                      {config.label} · {config.description}
                                    </span>
                                    <h3 className="text-lg font-bold text-white mt-1 leading-tight">
                                      {signal.title}
                                    </h3>
                                  </div>
                                </div>
                              </div>

                              <div className="px-6 pt-5 space-y-5">
                                {/* Meta Info */}
                                <div className="flex flex-wrap gap-2">
                                  {signal.assignee && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                                      <User className="w-3.5 h-3.5 text-slate-500" />
                                      <span className="text-sm text-slate-700">{signal.assignee.name || "Unknown"}</span>
                                    </div>
                                  )}
                                  {signal.spaceName && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                                      <Target className="w-3.5 h-3.5 text-slate-500" />
                                      <span className="text-sm text-slate-700">{signal.spaceName}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                    <span className="text-sm text-slate-700">
                                      {new Date(signal.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>

                                {/* AI Summary */}
                                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                                      <Sparkles className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700">AI Analysis</span>
                                  </div>

                                  {summaryLoading ? (
                                    <div className="flex items-center gap-3 py-4">
                                      <div className="w-5 h-5 border-2 border-slate-300 border-t-purple-500 rounded-full animate-spin" />
                                      <span className="text-sm text-slate-500">Analyzing context...</span>
                                    </div>
                                  ) : summary ? (
                                    <div className="space-y-4">
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <Zap className="w-4 h-4 text-amber-500" />
                                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Context</span>
                                        </div>
                                        <p className="text-sm text-slate-700 leading-relaxed">{summary.context}</p>
                                      </div>
                                      <div className="border-t border-slate-200 pt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                          <AlertTriangle className="w-4 h-4 text-red-500" />
                                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Impact</span>
                                        </div>
                                        <p className="text-sm text-slate-700 leading-relaxed">{summary.impact}</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-slate-500 py-2">Unable to load analysis</p>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-3 pt-2">
                                  <button
                                    onClick={() => handleNavigate(signal)}
                                    className={cn(
                                      "w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-white",
                                      "bg-gradient-to-r shadow-lg transition-all active:scale-[0.98]",
                                      config.gradient
                                    )}
                                  >
                                    <ExternalLink className="w-5 h-5" />
                                    View Details
                                  </button>

                                  <div className="grid grid-cols-3 gap-2">
                                    <button
                                      onClick={() => dismissMutation.mutate({
                                        signalKey: signal.id,
                                        type: "snooze",
                                        snoozeDays: 1,
                                      })}
                                      className="flex flex-col items-center gap-1 py-3 px-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                    >
                                      <BellOff className="w-5 h-5 text-slate-600" />
                                      <span className="text-xs font-medium text-slate-700">1 day</span>
                                    </button>
                                    <button
                                      onClick={() => dismissMutation.mutate({
                                        signalKey: signal.id,
                                        type: "snooze",
                                        snoozeDays: 3,
                                      })}
                                      className="flex flex-col items-center gap-1 py-3 px-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                    >
                                      <BellOff className="w-5 h-5 text-slate-600" />
                                      <span className="text-xs font-medium text-slate-700">3 days</span>
                                    </button>
                                    <button
                                      onClick={() => dismissMutation.mutate({
                                        signalKey: signal.id,
                                        type: "snooze",
                                        snoozeDays: 7,
                                      })}
                                      className="flex flex-col items-center gap-1 py-3 px-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                    >
                                      <BellOff className="w-5 h-5 text-slate-600" />
                                      <span className="text-xs font-medium text-slate-700">7 days</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </SheetContent>
                          </Sheet>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
