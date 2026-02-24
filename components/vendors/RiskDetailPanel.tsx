"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  ExternalLink,
  Save,
  Loader2,
  Lightbulb,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface RiskDetailPanelProps {
  risk: any;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "MITIGATING", label: "Mitigating" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "ACCEPTED", label: "Accepted" },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  OPEN: {
    label: "Open",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  MITIGATING: {
    label: "Mitigating",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  RESOLVED: {
    label: "Resolved",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  ACCEPTED: {
    label: "Accepted",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

const CATEGORY_CONFIG: Record<string, { label: string; className: string }> = {
  SLA_BREACH: {
    label: "SLA Breach",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  CONTRACT: {
    label: "Contract",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  DELIVERY: {
    label: "Delivery",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  FINANCIAL: {
    label: "Financial",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  OPERATIONAL: {
    label: "Operational",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  SECURITY: {
    label: "Security",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

function getScoreColor(score: number): string {
  if (score >= 15) return "text-red-700 bg-red-100 border-red-300";
  if (score >= 8) return "text-orange-700 bg-orange-100 border-orange-300";
  if (score >= 4) return "text-yellow-700 bg-yellow-100 border-yellow-300";
  return "text-green-700 bg-green-100 border-green-300";
}

function getScoreLabel(score: number): string {
  if (score >= 15) return "Critical";
  if (score >= 8) return "High";
  if (score >= 4) return "Medium";
  return "Low";
}

export function RiskDetailPanel({
  risk,
  open,
  onClose,
  onUpdate,
}: RiskDetailPanelProps) {
  const queryClient = useQueryClient();
  const [mitigationPlan, setMitigationPlan] = useState(
    risk?.mitigationPlan || ""
  );
  const [isMitigationDirty, setIsMitigationDirty] = useState(false);

  // Update mitigation plan state when risk changes
  const currentRiskId = risk?.id;
  const [lastRiskId, setLastRiskId] = useState(currentRiskId);
  if (currentRiskId !== lastRiskId) {
    setLastRiskId(currentRiskId);
    setMitigationPlan(risk?.mitigationPlan || "");
    setIsMitigationDirty(false);
  }

  // Fetch applicable playbooks
  const { data: playbooksData } = useQuery({
    queryKey: ["playbooks", risk?.category],
    queryFn: async () => {
      const res = await fetch(
        `/api/playbooks?category=${risk.category}&active=true`
      );
      if (!res.ok) throw new Error("Failed to fetch playbooks");
      return res.json();
    },
    enabled: !!risk?.category && open,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/risks/${risk.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risks"] });
      onUpdate();
    },
  });

  // Save mitigation plan mutation
  const saveMitigationMutation = useMutation({
    mutationFn: async (plan: string) => {
      const res = await fetch(`/api/risks/${risk.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mitigationPlan: plan }),
      });
      if (!res.ok) throw new Error("Failed to save mitigation plan");
      return res.json();
    },
    onSuccess: () => {
      setIsMitigationDirty(false);
      queryClient.invalidateQueries({ queryKey: ["risks"] });
      onUpdate();
    },
  });

  if (!risk) return null;

  const statusConf = STATUS_CONFIG[risk.status] || {
    label: risk.status,
    className: "bg-gray-100 text-gray-700 border-gray-200",
  };
  const categoryConf = CATEGORY_CONFIG[risk.category] || {
    label: risk.category,
    className: "bg-gray-50 text-gray-700 border-gray-200",
  };
  const score = risk.riskScore ?? risk.probability * risk.impact;
  const aiSuggestions = risk.aiSuggestions;
  const playbooks = playbooksData?.playbooks || [];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-3 pr-8">
            <div className="p-2 rounded-lg bg-gray-100 shrink-0">
              <Shield className="w-5 h-5 text-gray-600" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg font-semibold text-gray-900 leading-tight">
                {risk.title}
              </SheetTitle>
              <SheetDescription className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={categoryConf.className}>
                  {categoryConf.label}
                </Badge>
                <Badge variant="outline" className={statusConf.className}>
                  {statusConf.label}
                </Badge>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-120px)]">
          <div className="px-6 py-5 space-y-6">
            {/* Risk Score Display */}
            <div className="text-center">
              <div
                className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border-2 ${getScoreColor(score)}`}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold">{score}</div>
                  <div className="text-xs font-medium mt-0.5">
                    {getScoreLabel(score)} Risk
                  </div>
                </div>
                <div className="text-sm pl-3 border-l border-current/20">
                  <span className="font-semibold">{risk.probability}</span>
                  <span className="text-xs opacity-70 mx-1">probability</span>
                  <span className="opacity-50">x</span>
                  <span className="font-semibold ml-1">{risk.impact}</span>
                  <span className="text-xs opacity-70 ml-1">impact</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {risk.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {risk.description}
                </p>
              </div>
            )}

            {/* Status Update */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Status
              </h4>
              <Select
                value={risk.status}
                onValueChange={(value) => updateStatusMutation.mutate(value)}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="w-full bg-white border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {updateStatusMutation.isPending && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Updating status...
                </p>
              )}
            </div>

            {/* Vendor Link */}
            {risk.vendor && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1.5">
                  Vendor
                </h4>
                <Link
                  href={`/vendors/${risk.vendor.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {risk.vendor.name}
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Change Request Link */}
            {risk.changeRequest && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1.5">
                  Change Request
                </h4>
                <Link
                  href={`/vendors/change-requests?id=${risk.changeRequest.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {risk.changeRequest.title}
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Mitigation Plan */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">
                  Mitigation Plan
                </h4>
                {isMitigationDirty && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => saveMitigationMutation.mutate(mitigationPlan)}
                    disabled={saveMitigationMutation.isPending}
                    className="h-7 text-xs"
                  >
                    {saveMitigationMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Save className="w-3 h-3 mr-1" />
                    )}
                    Save
                  </Button>
                )}
              </div>
              <Textarea
                placeholder="Describe the mitigation strategy for this risk..."
                value={mitigationPlan}
                onChange={(e) => {
                  setMitigationPlan(e.target.value);
                  setIsMitigationDirty(true);
                }}
                rows={4}
                className="bg-white border-gray-300 text-sm"
              />
              {saveMitigationMutation.isError && (
                <p className="text-xs text-red-600 mt-1">
                  Failed to save mitigation plan. Please try again.
                </p>
              )}
            </div>

            {/* AI Suggestions */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                AI Suggestions
              </h4>
              {aiSuggestions && Array.isArray(aiSuggestions) && aiSuggestions.length > 0 ? (
                <div className="space-y-2">
                  {aiSuggestions.map(
                    (
                      suggestion: {
                        title?: string;
                        description?: string;
                        applicability?: string;
                      },
                      index: number
                    ) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg border border-amber-200 bg-amber-50"
                      >
                        {suggestion.title && (
                          <p className="text-sm font-medium text-amber-900 mb-1">
                            {suggestion.title}
                          </p>
                        )}
                        {suggestion.description && (
                          <p className="text-xs text-amber-800 leading-relaxed">
                            {suggestion.description}
                          </p>
                        )}
                        {suggestion.applicability && (
                          <p className="text-xs text-amber-600 mt-1 italic">
                            {suggestion.applicability}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              ) : aiSuggestions === null || aiSuggestions === undefined ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">
                    Generating suggestions...
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <AlertTriangle className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    No AI suggestions available yet.
                  </span>
                </div>
              )}
            </div>

            {/* Applicable Playbooks */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-500" />
                Applicable Playbooks
              </h4>
              {playbooks.length > 0 ? (
                <div className="space-y-2">
                  {playbooks.map((playbook: any) => (
                    <div
                      key={playbook.id}
                      className="p-3 rounded-lg border border-blue-200 bg-blue-50"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-blue-900">
                          {playbook.name}
                        </p>
                        {playbook.isSystemProvided && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-blue-100 text-blue-700 border-blue-300"
                          >
                            System
                          </Badge>
                        )}
                      </div>
                      {playbook.description && (
                        <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                          {playbook.description}
                        </p>
                      )}
                      {playbook.steps &&
                        Array.isArray(playbook.steps) &&
                        playbook.steps.length > 0 && (
                          <p className="text-xs text-blue-600 mt-1">
                            {playbook.steps.length} step
                            {playbook.steps.length !== 1 ? "s" : ""}
                          </p>
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 p-3 rounded-lg border border-gray-200 bg-gray-50">
                  No active playbooks for this risk category.
                </p>
              )}
            </div>

            {/* Created by */}
            {risk.createdBy && (
              <div className="text-xs text-gray-500 pt-3 border-t border-gray-200">
                Created by {risk.createdBy.name || "Unknown"}{" "}
                {risk.createdAt &&
                  `on ${new Date(risk.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}`}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
