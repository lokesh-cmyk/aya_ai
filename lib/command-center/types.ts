// lib/command-center/types.ts

export type SignalType =
  | "shipped"
  | "stale"
  | "blocked"
  | "overdue"
  | "bottleneck"
  | "comm_gap"
  | "velocity";

export type SignalSeverity = "critical" | "warning" | "info";

export interface Signal {
  id: string;
  type: SignalType;
  severity: SignalSeverity;
  title: string;
  subtitle: string;
  spaceId: string | null;
  spaceName: string | null;
  entityType: "task" | "contact" | "user";
  entityId: string;
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
  };
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export interface SignalSummary {
  total: number;
  byType: Record<SignalType, number>;
  bySpace: Record<string, number>;
}

export interface VelocityTrend {
  thisWeek: number;
  lastWeek: number;
  percentChange: number;
}

export interface CommandCenterResponse {
  signals: Signal[];
  summary: SignalSummary;
  velocityTrend: VelocityTrend;
}

export interface AISummaryResponse {
  context: string;
  impact: string;
}

// Detection thresholds
export const STALENESS_THRESHOLDS = {
  URGENT: 4,   // days
  HIGH: 6,
  NORMAL: 9,
  LOW: 14,
} as const;

export const STALENESS_PROGRESS_THRESHOLD = 20; // percent
export const STALENESS_PROGRESS_DAYS = 14;
export const COMM_GAP_DAYS = 3;
export const BOTTLENECK_THRESHOLD = 3; // tasks blocking others
export const VELOCITY_DROP_THRESHOLD = 50; // percent
