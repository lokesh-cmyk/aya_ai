"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Plus,
  ArrowRight,
  User,
  Calendar,
  TrendingUp,
} from "lucide-react";

interface VendorRisksProps {
  vendorId: string;
  risks: any[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  IDENTIFIED: {
    label: "Identified",
    className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
  },
  ASSESSING: {
    label: "Assessing",
    className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
  MITIGATING: {
    label: "Mitigating",
    className: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
  },
  RESOLVED: {
    label: "Resolved",
    className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  },
  ACCEPTED: {
    label: "Accepted",
    className: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100",
  },
};

const categoryConfig: Record<string, { label: string; className: string }> = {
  SECURITY: {
    label: "Security",
    className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50",
  },
  COMPLIANCE: {
    label: "Compliance",
    className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
  },
  FINANCIAL: {
    label: "Financial",
    className: "bg-green-50 text-green-700 border-green-200 hover:bg-green-50",
  },
  OPERATIONAL: {
    label: "Operational",
    className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
  },
  STRATEGIC: {
    label: "Strategic",
    className: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50",
  },
  REPUTATIONAL: {
    label: "Reputational",
    className: "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-50",
  },
};

function getRiskScoreBadge(score: number) {
  if (score >= 16) {
    return (
      <Badge
        variant="outline"
        className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 font-bold"
      >
        {score}
      </Badge>
    );
  }
  if (score >= 8) {
    return (
      <Badge
        variant="outline"
        className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 font-bold"
      >
        {score}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 font-bold"
    >
      {score}
    </Badge>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function VendorRisks({ vendorId, risks }: VendorRisksProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Risks ({risks.length})
        </h3>
        <div className="flex items-center gap-2">
          <Link href="/vendors/risks">
            <Button variant="ghost" size="sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              View Heatmap
            </Button>
          </Link>
          <Link href={`/vendors/risks?vendorId=${vendorId}`}>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Risk
            </Button>
          </Link>
        </div>
      </div>

      {risks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 bg-gray-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-medium text-gray-900 mb-1">No risks recorded</p>
          <p className="text-sm text-gray-500 mb-4">
            Add risks to track and manage vendor-related threats
          </p>
          <Link href={`/vendors/risks?vendorId=${vendorId}`}>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1.5" />
              Add First Risk
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {risks.map((risk: any) => {
            const status = statusConfig[risk.status] || {
              label: risk.status,
              className: "bg-gray-100 text-gray-700 border-gray-200",
            };
            const category = categoryConfig[risk.category] || {
              label: risk.category,
              className: "bg-gray-50 text-gray-700 border-gray-200",
            };

            return (
              <div
                key={risk.id}
                className="p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {risk.title}
                      </p>
                    </div>

                    {/* Probability x Impact = Risk Score */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <span>
                        Probability: {risk.probability} x Impact: {risk.impact} ={" "}
                      </span>
                      {getRiskScoreBadge(risk.riskScore)}
                    </div>

                    {/* Mitigation plan preview */}
                    {risk.mitigationPlan && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        <span className="font-medium">Mitigation:</span>{" "}
                        {risk.mitigationPlan}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {risk.createdBy && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {risk.createdBy.name || risk.createdBy.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(risk.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant="outline" className={category.className}>
                      {category.label}
                    </Badge>
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
