// lib/command-center/signals.ts

import { prisma } from "@/lib/prisma";
import {
  Signal,
  SignalType,
  SignalSeverity,
  STALENESS_THRESHOLDS,
  STALENESS_PROGRESS_THRESHOLD,
  STALENESS_PROGRESS_DAYS,
  COMM_GAP_DAYS,
  BOTTLENECK_THRESHOLD,
  VELOCITY_DROP_THRESHOLD,
} from "./types";

// Helper to calculate days ago
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// Get spaces user has access to based on role
export async function getAccessibleSpaceIds(
  userId: string,
  teamId: string,
  role: string
): Promise<string[] | null> {
  // ADMIN sees all
  if (role === "ADMIN") return null; // null means all spaces

  // EDITOR/VIEWER see only their spaces
  const memberships = await prisma.spaceMember.findMany({
    where: { userId },
    select: { spaceId: true },
  });

  return memberships.map((m) => m.spaceId);
}

// Detect shipped tasks (last 7 days)
export async function detectShippedSignals(
  teamId: string,
  spaceIds: string[] | null
): Promise<Signal[]> {
  const sevenDaysAgo = daysAgo(7);

  const tasks = await prisma.task.findMany({
    where: {
      taskList: {
        space: {
          teamId,
          ...(spaceIds && { id: { in: spaceIds } }),
        },
      },
      status: {
        name: { in: ["CLOSED", "Done", "Closed", "DONE", "COMPLETED", "Completed", "done"] },
      },
      updatedAt: { gte: sevenDaysAgo },
    },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      taskList: {
        include: { space: { select: { id: true, name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return tasks.map((task) => ({
    id: `task:${task.id}:shipped`,
    type: "shipped" as SignalType,
    severity: "info" as SignalSeverity,
    title: `"${task.name}" shipped`,
    subtitle: `${task.assignee?.name || "Unassigned"} · ${task.taskList.space?.name || "No space"}`,
    spaceId: task.taskList.space?.id || null,
    spaceName: task.taskList.space?.name || null,
    entityType: "task" as const,
    entityId: task.id,
    assignee: task.assignee || undefined,
    createdAt: task.updatedAt,
    metadata: { taskId: task.taskId, progress: task.progress },
  }));
}

// Detect stale tasks
export async function detectStaleSignals(
  teamId: string,
  spaceIds: string[] | null
): Promise<Signal[]> {
  const tasks = await prisma.task.findMany({
    where: {
      taskList: {
        space: {
          teamId,
          ...(spaceIds && { id: { in: spaceIds } }),
        },
      },
      status: {
        name: { in: ["ONGOING", "In Progress", "IN_PROGRESS", "OPEN", "Open"] },
      },
    },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      taskList: {
        include: { space: { select: { id: true, name: true } } },
      },
    },
  });

  const now = new Date();
  const signals: Signal[] = [];

  for (const task of tasks) {
    const daysSinceUpdate = Math.floor(
      (now.getTime() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check progress-based staleness (< 20% in 14 days)
    const progress = task.progress || 0;
    if (progress < STALENESS_PROGRESS_THRESHOLD && daysSinceUpdate >= STALENESS_PROGRESS_DAYS) {
      signals.push(createStaleSignal(task, daysSinceUpdate, "low progress"));
      continue;
    }

    // Check priority-based staleness
    const threshold = getThresholdForPriority(task.priority);
    if (daysSinceUpdate >= threshold) {
      signals.push(createStaleSignal(task, daysSinceUpdate, "no updates"));
    }
  }

  return signals;
}

function getThresholdForPriority(priority: string): number {
  switch (priority) {
    case "URGENT": return STALENESS_THRESHOLDS.URGENT;
    case "HIGH": return STALENESS_THRESHOLDS.HIGH;
    case "NORMAL": return STALENESS_THRESHOLDS.NORMAL;
    case "LOW": return STALENESS_THRESHOLDS.LOW;
    default: return STALENESS_THRESHOLDS.NORMAL;
  }
}

function createStaleSignal(task: any, days: number, reason: string): Signal {
  return {
    id: `task:${task.id}:stale`,
    type: "stale",
    severity: "warning",
    title: `"${task.name}" stale (${reason})`,
    subtitle: `${task.assignee?.name || "Unassigned"} · ${task.taskList.space?.name || "No space"} · ${days}d no movement`,
    spaceId: task.taskList.space?.id || null,
    spaceName: task.taskList.space?.name || null,
    entityType: "task",
    entityId: task.id,
    assignee: task.assignee || undefined,
    createdAt: task.updatedAt,
    metadata: { daysSinceUpdate: days, progress: task.progress, priority: task.priority },
  };
}

// Detect blocked tasks
export async function detectBlockedSignals(
  teamId: string,
  spaceIds: string[] | null
): Promise<Signal[]> {
  const tasks = await prisma.task.findMany({
    where: {
      taskList: {
        space: {
          teamId,
          ...(spaceIds && { id: { in: spaceIds } }),
        },
      },
      status: {
        name: { in: ["NEED_RESOLVING", "Blocked", "BLOCKED", "Need Resolving", "NEED RESOLVING"] },
      },
    },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      taskList: {
        include: { space: { select: { id: true, name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return tasks.map((task) => {
    const daysSinceUpdate = Math.floor(
      (new Date().getTime() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      id: `task:${task.id}:blocked`,
      type: "blocked" as SignalType,
      severity: "critical" as SignalSeverity,
      title: `"${task.name}" is blocked`,
      subtitle: `${task.assignee?.name || "Unassigned"} · ${task.taskList.space?.name || "No space"} · ${daysSinceUpdate}d stuck`,
      spaceId: task.taskList.space?.id || null,
      spaceName: task.taskList.space?.name || null,
      entityType: "task" as const,
      entityId: task.id,
      assignee: task.assignee || undefined,
      createdAt: task.updatedAt,
      metadata: { daysSinceUpdate },
    };
  });
}

// Detect overdue tasks
export async function detectOverdueSignals(
  teamId: string,
  spaceIds: string[] | null
): Promise<Signal[]> {
  const now = new Date();

  const tasks = await prisma.task.findMany({
    where: {
      taskList: {
        space: {
          teamId,
          ...(spaceIds && { id: { in: spaceIds } }),
        },
      },
      dueDate: { lt: now },
      status: {
        name: { notIn: ["CLOSED", "Done", "Closed", "DONE", "COMPLETED", "Completed", "done"] },
      },
    },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      taskList: {
        include: { space: { select: { id: true, name: true } } },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return tasks.map((task) => {
    const daysOverdue = Math.floor(
      (now.getTime() - (task.dueDate?.getTime() || now.getTime())) / (1000 * 60 * 60 * 24)
    );

    return {
      id: `task:${task.id}:overdue`,
      type: "overdue" as SignalType,
      severity: "critical" as SignalSeverity,
      title: `"${task.name}" overdue`,
      subtitle: `${task.assignee?.name || "Unassigned"} · ${task.taskList.space?.name || "No space"} · ${daysOverdue}d late`,
      spaceId: task.taskList.space?.id || null,
      spaceName: task.taskList.space?.name || null,
      entityType: "task" as const,
      entityId: task.id,
      assignee: task.assignee || undefined,
      createdAt: task.dueDate || task.updatedAt,
      metadata: { daysOverdue, dueDate: task.dueDate },
    };
  });
}

// Detect communication gaps
export async function detectCommGapSignals(
  teamId: string
): Promise<Signal[]> {
  const gapDate = daysAgo(COMM_GAP_DAYS);

  // Find contacts with inbound messages but no outbound response
  const contacts = await prisma.contact.findMany({
    where: {
      teamId,
      messages: {
        some: {
          direction: "INBOUND",
          createdAt: { lt: gapDate },
        },
      },
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 2,
        select: {
          id: true,
          direction: true,
          createdAt: true,
          content: true,
        },
      },
    },
  });

  const signals: Signal[] = [];

  for (const contact of contacts) {
    const lastMessage = contact.messages[0];
    if (!lastMessage || lastMessage.direction !== "INBOUND") continue;

    const daysSinceMessage = Math.floor(
      (new Date().getTime() - lastMessage.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceMessage >= COMM_GAP_DAYS) {
      signals.push({
        id: `contact:${contact.id}:comm_gap`,
        type: "comm_gap",
        severity: "warning",
        title: `No response to ${contact.name || contact.email || "Unknown"}`,
        subtitle: `${daysSinceMessage}d waiting · Last: "${(lastMessage.content || "").slice(0, 50)}..."`,
        spaceId: null,
        spaceName: null,
        entityType: "contact",
        entityId: contact.id,
        createdAt: lastMessage.createdAt,
        metadata: { daysSinceMessage, lastMessageId: lastMessage.id },
      });
    }
  }

  return signals;
}

// Detect bottleneck people
export async function detectBottleneckSignals(
  teamId: string,
  spaceIds: string[] | null
): Promise<Signal[]> {
  // Find users with multiple blocked/waiting tasks assigned to them
  const blockedTasks = await prisma.task.findMany({
    where: {
      taskList: {
        space: {
          teamId,
          ...(spaceIds && { id: { in: spaceIds } }),
        },
      },
      status: {
        name: { in: ["NEED_RESOLVING", "Blocked", "BLOCKED"] },
      },
      assigneeId: { not: null },
    },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
    },
  });

  // Group by assignee
  const byAssignee = new Map<string, typeof blockedTasks>();
  for (const task of blockedTasks) {
    if (!task.assigneeId) continue;
    const existing = byAssignee.get(task.assigneeId) || [];
    existing.push(task);
    byAssignee.set(task.assigneeId, existing);
  }

  const signals: Signal[] = [];

  for (const [assigneeId, tasks] of byAssignee) {
    if (tasks.length >= BOTTLENECK_THRESHOLD) {
      const assignee = tasks[0].assignee;
      signals.push({
        id: `user:${assigneeId}:bottleneck`,
        type: "bottleneck",
        severity: "critical",
        title: `${assignee?.name || "Unknown"} has ${tasks.length} blocked tasks`,
        subtitle: `Potential bottleneck - multiple items stuck`,
        spaceId: null,
        spaceName: null,
        entityType: "user",
        entityId: assigneeId,
        assignee: assignee || undefined,
        createdAt: new Date(),
        metadata: { blockedCount: tasks.length, taskIds: tasks.map((t) => t.id) },
      });
    }
  }

  return signals;
}

// Calculate velocity trend
export async function calculateVelocityTrend(
  teamId: string,
  spaceIds: string[] | null
): Promise<{ thisWeek: number; lastWeek: number; percentChange: number }> {
  const thisWeekStart = daysAgo(7);
  const lastWeekStart = daysAgo(14);

  const [thisWeekCount, lastWeekCount] = await Promise.all([
    prisma.task.count({
      where: {
        taskList: {
          space: {
            teamId,
            ...(spaceIds && { id: { in: spaceIds } }),
          },
        },
        status: {
          name: { in: ["CLOSED", "Done", "Closed", "DONE"] },
        },
        updatedAt: { gte: thisWeekStart },
      },
    }),
    prisma.task.count({
      where: {
        taskList: {
          space: {
            teamId,
            ...(spaceIds && { id: { in: spaceIds } }),
          },
        },
        status: {
          name: { in: ["CLOSED", "Done", "Closed", "DONE"] },
        },
        updatedAt: { gte: lastWeekStart, lt: thisWeekStart },
      },
    }),
  ]);

  const percentChange = lastWeekCount === 0
    ? (thisWeekCount > 0 ? 100 : 0)
    : Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);

  return { thisWeek: thisWeekCount, lastWeek: lastWeekCount, percentChange };
}

// Create velocity signal if significant drop
export function createVelocitySignal(
  velocity: { thisWeek: number; lastWeek: number; percentChange: number }
): Signal | null {
  if (velocity.percentChange <= -VELOCITY_DROP_THRESHOLD && velocity.lastWeek > 0) {
    return {
      id: `velocity:${Date.now()}`,
      type: "velocity",
      severity: "info",
      title: `Velocity dropped ${Math.abs(velocity.percentChange)}%`,
      subtitle: `${velocity.thisWeek} tasks this week vs ${velocity.lastWeek} last week`,
      spaceId: null,
      spaceName: null,
      entityType: "task",
      entityId: "velocity",
      createdAt: new Date(),
      metadata: velocity,
    };
  }
  return null;
}
