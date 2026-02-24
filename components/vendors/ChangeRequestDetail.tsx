"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  Calendar,
  DollarSign,
  Clock,
  Target,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";

interface ChangeRequestDetailProps {
  changeRequest: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100",
  },
  SUBMITTED: {
    label: "Submitted",
    className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
  APPROVED: {
    label: "Approved",
    className:
      "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  },
  IMPLEMENTED: {
    label: "Implemented",
    className:
      "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
  },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  LOW: {
    label: "Low",
    className: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100",
  },
  NORMAL: {
    label: "Normal",
    className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
  },
  HIGH: {
    label: "High",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
  URGENT: {
    label: "Urgent",
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Render a JSON object as key-value pairs, recursively for nested objects */
function RenderJsonData({ data, depth = 0 }: { data: any; depth?: number }) {
  if (!data || typeof data !== "object") {
    return <span className="text-sm text-gray-700">{String(data ?? "--")}</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-sm text-gray-400">--</span>;
    return (
      <div className="space-y-2">
        {data.map((item, idx) => (
          <div
            key={idx}
            className="border border-gray-100 rounded-md p-2 bg-gray-50/50"
          >
            <RenderJsonData data={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${depth > 0 ? "" : ""}`}>
      {Object.entries(data).map(([key, value]) => {
        const label = key
          .replace(/([A-Z])/g, " $1")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .trim();

        if (value && typeof value === "object" && !Array.isArray(value)) {
          return (
            <div key={key} className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {label}
              </p>
              <div className="pl-3 border-l-2 border-gray-200">
                <RenderJsonData data={value} depth={depth + 1} />
              </div>
            </div>
          );
        }

        if (Array.isArray(value)) {
          return (
            <div key={key} className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {label}
              </p>
              <div className="pl-3 border-l-2 border-gray-200">
                <RenderJsonData data={value} depth={depth + 1} />
              </div>
            </div>
          );
        }

        return (
          <div key={key} className="flex items-start gap-2 text-sm">
            <span className="text-gray-500 font-medium min-w-[100px] shrink-0">
              {label}:
            </span>
            <span className="text-gray-800">
              {value === null || value === undefined ? "--" : String(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ChangeRequestDetail({
  changeRequest,
  open,
  onOpenChange,
  onUpdate,
}: ChangeRequestDetailProps) {
  const queryClient = useQueryClient();
  const cr = changeRequest;

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const status = statusConfig[cr?.status] || statusConfig.DRAFT;
  const priority = priorityConfig[cr?.priority] || priorityConfig.NORMAL;

  const originalPlan = cr?.originalPlan as Record<string, any> | null;
  const requestedChange = cr?.requestedChange as Record<string, any> | null;
  const impactAnalysis = cr?.impactAnalysis as Record<string, any> | null;

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/change-requests/${cr.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to approve");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change-requests"] });
      onUpdate();
      onOpenChange(false);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/change-requests/${cr.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          reason: rejectReason || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to reject");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change-requests"] });
      setRejectReason("");
      setShowRejectForm(false);
      onUpdate();
      onOpenChange(false);
    },
  });

  // Status update mutation
  const statusUpdateMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/change-requests/${cr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change-requests"] });
      onUpdate();
    },
  });

  if (!cr) return null;

  const canSubmit = cr.status === "DRAFT";
  const canReview =
    cr.status === "SUBMITTED" || cr.status === "UNDER_REVIEW";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 space-y-6">
            {/* Header */}
            <DialogHeader>
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-xl leading-tight">
                    {cr.title}
                  </DialogTitle>
                  <DialogDescription className="mt-2">
                    {cr.description || "No description provided."}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant="outline" className={status.className}>
                  {status.label}
                </Badge>
                <Badge variant="outline" className={priority.className}>
                  {priority.label}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-3">
                {cr.vendor?.name && (
                  <span className="font-medium text-gray-700">
                    {cr.vendor.name}
                  </span>
                )}
                {cr.createdBy?.name && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {cr.createdBy.name}
                  </span>
                )}
                {cr.createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(cr.createdAt)}
                  </span>
                )}
                {cr.requestedBy && (
                  <span className="text-gray-400">
                    Requested by: {cr.requestedBy}
                  </span>
                )}
              </div>
              {cr.approvedBy && cr.approvedAt && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <span>
                    {cr.status === "APPROVED" ? "Approved" : "Reviewed"} by{" "}
                    {cr.approvedBy.name} on {formatDateTime(cr.approvedAt)}
                  </span>
                </div>
              )}
              {cr.rejectedReason && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <span className="font-medium">Rejection reason: </span>
                  {cr.rejectedReason}
                </div>
              )}
            </DialogHeader>

            {/* Plan vs Change Comparison */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Plan vs Change Comparison
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Plan */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Original Plan
                    </h4>
                  </div>
                  {originalPlan &&
                  Object.keys(originalPlan).length > 0 ? (
                    <RenderJsonData data={originalPlan} />
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      No original plan recorded
                    </p>
                  )}
                </div>

                {/* Requested Change */}
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                      Requested Change
                    </h4>
                  </div>
                  {requestedChange &&
                  Object.keys(requestedChange).length > 0 ? (
                    <RenderJsonData data={requestedChange} />
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      No specific changes described
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* AI Impact Analysis */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                AI Impact Analysis
              </h3>
              {impactAnalysis && Object.keys(impactAnalysis).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Cost Impact */}
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Cost Impact
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {impactAnalysis.costImpact ||
                        impactAnalysis.cost_impact ||
                        "--"}
                    </p>
                  </div>

                  {/* Timeline Impact */}
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Timeline Impact
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {impactAnalysis.timelineImpact ||
                        impactAnalysis.timeline_impact ||
                        "--"}
                    </p>
                  </div>

                  {/* Scope Impact */}
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Scope Impact
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {impactAnalysis.scopeImpact ||
                        impactAnalysis.scope_impact ||
                        "--"}
                    </p>
                  </div>

                  {/* Risk Assessment */}
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Risk Assessment
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {impactAnalysis.riskAssessment ||
                        impactAnalysis.risk_assessment ||
                        "--"}
                    </p>
                  </div>

                  {/* Summary if present */}
                  {impactAnalysis.summary && (
                    <div className="border border-gray-200 rounded-lg p-3 sm:col-span-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Summary
                      </p>
                      <p className="text-sm text-gray-700">
                        {impactAnalysis.summary}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 py-8 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">
                    Analyzing impact... This may take a moment.
                  </span>
                </div>
              )}
            </div>

            {/* Status Update (for DRAFT -> SUBMITTED) */}
            {canSubmit && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Status Update
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    Current: {status.label}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <Button
                    size="sm"
                    onClick={() => statusUpdateMutation.mutate("SUBMITTED")}
                    disabled={statusUpdateMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {statusUpdateMutation.isPending
                      ? "Submitting..."
                      : "Submit for Review"}
                  </Button>
                </div>
                {statusUpdateMutation.isError && (
                  <p className="text-xs text-red-600 mt-2">
                    {statusUpdateMutation.error?.message ||
                      "Failed to update status"}
                  </p>
                )}
              </div>
            )}

            {/* Admin Status Update */}
            {(cr.status === "SUBMITTED" ||
              cr.status === "UNDER_REVIEW" ||
              cr.status === "APPROVED") && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Update Status
                </h3>
                <div className="flex items-center gap-3">
                  <Select
                    onValueChange={(val) => statusUpdateMutation.mutate(val)}
                    disabled={statusUpdateMutation.isPending}
                  >
                    <SelectTrigger className="w-[200px] bg-white border-gray-300">
                      <SelectValue placeholder="Change status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cr.status === "SUBMITTED" && (
                        <SelectItem value="UNDER_REVIEW">
                          Under Review
                        </SelectItem>
                      )}
                      {cr.status === "APPROVED" && (
                        <SelectItem value="IMPLEMENTED">
                          Implemented
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {statusUpdateMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  )}
                </div>
                {statusUpdateMutation.isError && (
                  <p className="text-xs text-red-600 mt-2">
                    {statusUpdateMutation.error?.message ||
                      "Failed to update status"}
                  </p>
                )}
              </div>
            )}

            {/* Approval Section */}
            {canReview && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Approval Decision
                </h3>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate()}
                    disabled={
                      approveMutation.isPending || rejectMutation.isPending
                    }
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    {approveMutation.isPending ? "Approving..." : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRejectForm(!showRejectForm)}
                    disabled={
                      approveMutation.isPending || rejectMutation.isPending
                    }
                    className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Reject
                  </Button>
                </div>

                {showRejectForm && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      placeholder="Reason for rejection (optional)..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="bg-white border-gray-300"
                      rows={3}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => rejectMutation.mutate()}
                        disabled={rejectMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {rejectMutation.isPending
                          ? "Rejecting..."
                          : "Confirm Rejection"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectReason("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {(approveMutation.isError || rejectMutation.isError) && (
                  <p className="text-xs text-red-600 mt-2">
                    {approveMutation.error?.message ||
                      rejectMutation.error?.message ||
                      "Action failed"}
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
