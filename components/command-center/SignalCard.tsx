// components/command-center/SignalCard.tsx

"use client";

import React, { useState } from "react";
import { Signal, SignalType } from "@/lib/command-center/types";
import { cn } from "@/lib/utils";
import { useCommandCenter, TaskPriority } from "./CommandCenterProvider";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  User,
  MessageSquare,
  TrendingDown,
  MoreHorizontal,
  Check,
  UserPlus,
  Flag,
  BellOff,
  X,
  Loader2,
  UserMinus,
  Calendar,
  Zap,
} from "lucide-react";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  LOW: { label: "Low", color: "text-gray-500" },
  NORMAL: { label: "Normal", color: "text-blue-500" },
  HIGH: { label: "High", color: "text-orange-500" },
  URGENT: { label: "Urgent", color: "text-red-500" },
};

const signalConfig: Record<
  SignalType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  shipped: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
  stale: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
  blocked: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
  overdue: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  bottleneck: { icon: User, color: "text-orange-600", bg: "bg-orange-50" },
  comm_gap: { icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50" },
  velocity: { icon: TrendingDown, color: "text-purple-600", bg: "bg-purple-50" },
  sla_breach: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  renewal_due: { icon: Calendar, color: "text-teal-600", bg: "bg-teal-50" },
  change_request_pending: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
  high_risk: { icon: Zap, color: "text-rose-600", bg: "bg-rose-50" },
};

interface SignalCardProps {
  signal: Signal;
  onNavigate?: (signal: Signal) => void;
}

export function SignalCard({ signal, onNavigate }: SignalCardProps) {
  const {
    dismissSignal,
    setHasOpenPopover,
    markTaskDone,
    updateTaskPriority,
    reassignTask,
    teamMembers,
  } = useCommandCenter();
  const [isHovered, setIsHovered] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isMarkingDone, setIsMarkingDone] = useState(false);

  const config = signalConfig[signal.type];
  const Icon = config.icon;

  const handleMarkDone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (signal.entityType !== "task") return;
    setIsMarkingDone(true);
    try {
      await markTaskDone(signal.entityId);
    } catch (error) {
      console.error("Failed to mark task as done:", error);
    } finally {
      setIsMarkingDone(false);
    }
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    if (signal.entityType !== "task") return;
    try {
      await updateTaskPriority(signal.entityId, priority);
    } catch (error) {
      console.error("Failed to update priority:", error);
    }
  };

  const handleReassign = async (assigneeId: string | null) => {
    if (signal.entityType !== "task") return;
    try {
      await reassignTask(signal.entityId, assigneeId);
    } catch (error) {
      console.error("Failed to reassign task:", error);
    }
  };

  // Fetch AI summary on extended hover
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["signal-summary", signal.id],
    queryFn: async () => {
      const res = await fetch(`/api/command-center/summary/${encodeURIComponent(signal.id)}`);
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
    enabled: showSummary,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Trigger summary after 1 second hover
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isHovered) {
      timer = setTimeout(() => setShowSummary(true), 1000);
    }
    return () => clearTimeout(timer);
  }, [isHovered]);

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(signal);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip open={showSummary && (summary || summaryLoading)}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "group relative flex items-start gap-3 p-3 rounded-lg border border-transparent",
              "hover:border-gray-200 hover:bg-gray-50/50 transition-all duration-200 cursor-pointer"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
              setIsHovered(false);
              setShowSummary(false);
            }}
            onClick={handleClick}
          >
            {/* Icon */}
            <div className={cn("p-1.5 rounded-md", config.bg)}>
              <Icon className={cn("w-4 h-4", config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {signal.title}
              </p>
              <p className="text-xs text-gray-500 truncate">{signal.subtitle}</p>
            </div>

            {/* Actions (visible on hover) */}
            <div
              className={cn(
                "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                isHovered && "opacity-100"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {signal.entityType === "task" && (
                <>
                  {/* Mark Done Button */}
                  <button
                    className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-green-600 disabled:opacity-50"
                    title="Mark done"
                    onClick={handleMarkDone}
                    disabled={isMarkingDone}
                  >
                    {isMarkingDone ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Reassign Dropdown */}
                  <DropdownMenu onOpenChange={setHasOpenPopover}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-blue-600"
                        title="Reassign"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
                      <DropdownMenuItem onClick={() => handleReassign(null)}>
                        <UserMinus className="w-4 h-4 mr-2 text-gray-400" />
                        Unassign
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {teamMembers.map((member) => (
                        <DropdownMenuItem
                          key={member.id}
                          onClick={() => handleReassign(member.id)}
                          className={cn(
                            signal.assignee?.id === member.id && "bg-blue-50"
                          )}
                        >
                          {member.image ? (
                            <img
                              src={member.image}
                              alt={member.name || ""}
                              className="w-5 h-5 rounded-full mr-2"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                              <User className="w-3 h-3 text-gray-500" />
                            </div>
                          )}
                          <span className="truncate">
                            {member.name || member.email}
                          </span>
                          {signal.assignee?.id === member.id && (
                            <Check className="w-3 h-3 ml-auto text-blue-600" />
                          )}
                        </DropdownMenuItem>
                      ))}
                      {teamMembers.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-gray-500">
                          No team members found
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Priority Dropdown */}
                  <DropdownMenu onOpenChange={setHasOpenPopover}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-orange-600"
                        title="Change priority"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      {(Object.keys(priorityConfig) as TaskPriority[]).map((priority) => (
                        <DropdownMenuItem
                          key={priority}
                          onClick={() => handlePriorityChange(priority)}
                        >
                          <Flag className={cn("w-4 h-4 mr-2", priorityConfig[priority].color)} />
                          {priorityConfig[priority].label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              {/* More Options Dropdown */}
              <DropdownMenu onOpenChange={setHasOpenPopover}>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded hover:bg-gray-200 text-gray-500">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => dismissSignal(signal.id, "snooze", 1)}
                  >
                    <BellOff className="w-4 h-4 mr-2" />
                    Snooze 1 day
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => dismissSignal(signal.id, "snooze", 3)}
                  >
                    <BellOff className="w-4 h-4 mr-2" />
                    Snooze 3 days
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => dismissSignal(signal.id, "snooze", 7)}
                  >
                    <BellOff className="w-4 h-4 mr-2" />
                    Snooze 7 days
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => dismissSignal(signal.id, "dismiss")}
                    className="text-red-600"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Dismiss
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </TooltipTrigger>

        {/* AI Summary Tooltip */}
        <TooltipContent
          side="left"
          className="w-80 p-0 bg-white border border-slate-200 shadow-xl"
        >
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="p-1 rounded bg-gradient-to-br from-violet-500 to-purple-600">
                <AlertCircle className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">AI Analysis</span>
            </div>
            {summaryLoading ? (
              <div className="flex items-center gap-3 py-2">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-purple-500 rounded-full animate-spin" />
                <span className="text-sm text-slate-600">Generating summary...</span>
              </div>
            ) : summary ? (
              <>
                <div>
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Context</p>
                  <p className="text-sm text-slate-800 leading-relaxed">{summary.context}</p>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1">Impact</p>
                  <p className="text-sm text-slate-800 leading-relaxed">{summary.impact}</p>
                </div>
              </>
            ) : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
