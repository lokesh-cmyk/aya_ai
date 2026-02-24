"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { User, Calendar } from "lucide-react";

interface ChangeRequestCardProps {
  changeRequest: any;
  onClick: () => void;
}

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
  });
}

export function ChangeRequestCard({
  changeRequest,
  onClick,
}: ChangeRequestCardProps) {
  const cr = changeRequest;
  const priority = priorityConfig[cr.priority] || priorityConfig.NORMAL;

  // Extract first line of impact analysis summary if available
  const impactAnalysis = cr.impactAnalysis as Record<string, any> | null;
  let impactSnippet: string | null = null;
  if (impactAnalysis) {
    if (typeof impactAnalysis.summary === "string") {
      impactSnippet = impactAnalysis.summary;
    } else if (typeof impactAnalysis.costImpact === "string") {
      impactSnippet = impactAnalysis.costImpact;
    } else if (typeof impactAnalysis.riskAssessment === "string") {
      impactSnippet = impactAnalysis.riskAssessment;
    }
  }

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer border-gray-200"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        {/* Title */}
        <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
          {cr.title}
        </p>

        {/* Vendor name */}
        {cr.vendor?.name && (
          <p className="text-xs text-gray-500 truncate">{cr.vendor.name}</p>
        )}

        {/* Priority badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priority.className}`}>
            {priority.label}
          </Badge>
        </div>

        {/* Impact snippet */}
        {impactSnippet && (
          <p className="text-xs text-gray-400 line-clamp-1 italic">
            {impactSnippet}
          </p>
        )}

        {/* Creator and date */}
        <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-1 border-t border-gray-100">
          {cr.createdBy?.name && (
            <span className="flex items-center gap-1 truncate">
              <User className="w-3 h-3 shrink-0" />
              {cr.createdBy.name}
            </span>
          )}
          {cr.createdAt && (
            <span className="flex items-center gap-1 shrink-0">
              <Calendar className="w-3 h-3" />
              {formatDate(cr.createdAt)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
