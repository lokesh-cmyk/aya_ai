// components/command-center/CommandCenterProvider.tsx

"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CommandCenterResponse, Signal } from "@/lib/command-center/types";

export type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface CommandCenterContextType {
  signals: Signal[];
  summary: CommandCenterResponse["summary"] | null;
  velocityTrend: CommandCenterResponse["velocityTrend"] | null;
  isLoading: boolean;
  error: Error | null;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  selectedSpaceId: string | null;
  setSelectedSpaceId: (spaceId: string | null) => void;
  dismissSignal: (signalKey: string, type: "dismiss" | "snooze" | "acknowledge", snoozeDays?: number) => void;
  refetch: () => void;
  // Track when any dropdown/popover is open to prevent sidebar collapse
  hasOpenPopover: boolean;
  setHasOpenPopover: (open: boolean) => void;
  // Task actions
  markTaskDone: (taskId: string) => Promise<void>;
  updateTaskPriority: (taskId: string, priority: TaskPriority) => Promise<void>;
  reassignTask: (taskId: string, assigneeId: string | null) => Promise<void>;
  // Team members for reassignment
  teamMembers: TeamMember[];
  isLoadingTeamMembers: boolean;
}

const CommandCenterContext = createContext<CommandCenterContextType | null>(null);

export function useCommandCenter() {
  const context = useContext(CommandCenterContext);
  if (!context) {
    throw new Error("useCommandCenter must be used within CommandCenterProvider");
  }
  return context;
}

export function CommandCenterProvider({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [hasOpenPopover, setHasOpenPopover] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<CommandCenterResponse>({
    queryKey: ["command-center", selectedSpaceId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSpaceId) params.set("spaceId", selectedSpaceId);
      const res = await fetch(`/api/command-center/signals?${params}`);
      if (!res.ok) throw new Error("Failed to fetch signals");
      return res.json();
    },
    staleTime: 30000,
    refetchInterval: isExpanded ? 60000 : false, // Only poll when expanded
  });

  // Fetch team members for reassignment
  const { data: teamMembersData, isLoading: isLoadingTeamMembers } = useQuery<{ users: TeamMember[] }>({
    queryKey: ["team-members"],
    queryFn: async () => {
      const res = await fetch("/api/users?limit=100");
      if (!res.ok) throw new Error("Failed to fetch team members");
      return res.json();
    },
    staleTime: 60000,
  });

  const dismissMutation = useMutation({
    mutationFn: async ({
      signalKey,
      type,
      snoozeDays,
    }: {
      signalKey: string;
      type: "dismiss" | "snooze" | "acknowledge";
      snoozeDays?: number;
    }) => {
      const res = await fetch("/api/command-center/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalKey, type, snoozeDays }),
      });
      if (!res.ok) throw new Error("Failed to dismiss signal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command-center"] });
    },
  });

  // Mark task as done mutation
  const markDoneMutation = useMutation({
    mutationFn: async (taskId: string) => {
      // First, get the task to find its available statuses
      const taskRes = await fetch(`/api/crm/tasks/${taskId}`);
      if (!taskRes.ok) throw new Error("Failed to fetch task");
      const taskData = await taskRes.json();

      // Find a "done" status from the task's status list
      const statuses = taskData.task?.taskList?.statuses || [];
      const doneStatus = statuses.find((s: { name: string; id: string }) =>
        /done|complete|finished|closed/i.test(s.name)
      );

      if (!doneStatus) {
        throw new Error("No 'Done' status found for this task");
      }

      // Update the task with the done status
      const res = await fetch(`/api/crm/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusId: doneStatus.id }),
      });
      if (!res.ok) throw new Error("Failed to mark task as done");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command-center"] });
    },
  });

  // Update task priority mutation
  const priorityMutation = useMutation({
    mutationFn: async ({ taskId, priority }: { taskId: string; priority: TaskPriority }) => {
      const res = await fetch(`/api/crm/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
      if (!res.ok) throw new Error("Failed to update priority");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command-center"] });
    },
  });

  // Reassign task mutation
  const reassignMutation = useMutation({
    mutationFn: async ({ taskId, assigneeId }: { taskId: string; assigneeId: string | null }) => {
      const res = await fetch(`/api/crm/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId }),
      });
      if (!res.ok) throw new Error("Failed to reassign task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command-center"] });
    },
  });

  const dismissSignal = useCallback(
    (signalKey: string, type: "dismiss" | "snooze" | "acknowledge", snoozeDays?: number) => {
      dismissMutation.mutate({ signalKey, type, snoozeDays });
    },
    [dismissMutation]
  );

  const markTaskDone = useCallback(
    async (taskId: string) => {
      await markDoneMutation.mutateAsync(taskId);
    },
    [markDoneMutation]
  );

  const updateTaskPriority = useCallback(
    async (taskId: string, priority: TaskPriority) => {
      await priorityMutation.mutateAsync({ taskId, priority });
    },
    [priorityMutation]
  );

  const reassignTask = useCallback(
    async (taskId: string, assigneeId: string | null) => {
      await reassignMutation.mutateAsync({ taskId, assigneeId });
    },
    [reassignMutation]
  );

  return (
    <CommandCenterContext.Provider
      value={{
        signals: data?.signals || [],
        summary: data?.summary || null,
        velocityTrend: data?.velocityTrend || null,
        isLoading,
        error: error as Error | null,
        isExpanded,
        setIsExpanded,
        selectedSpaceId,
        setSelectedSpaceId,
        dismissSignal,
        refetch,
        hasOpenPopover,
        setHasOpenPopover,
        markTaskDone,
        updateTaskPriority,
        reassignTask,
        teamMembers: teamMembersData?.users || [],
        isLoadingTeamMembers,
      }}
    >
      {children}
    </CommandCenterContext.Provider>
  );
}
