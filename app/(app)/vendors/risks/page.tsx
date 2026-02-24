"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Plus,
  AlertTriangle,
  ShieldCheck,
  Activity,
  ArrowLeft,
  User,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { RiskHeatmap } from "@/components/vendors/RiskHeatmap";
import { RiskDetailPanel } from "@/components/vendors/RiskDetailPanel";
import { CreateRiskDialog } from "@/components/vendors/CreateRiskDialog";

/* eslint-disable @typescript-eslint/no-explicit-any */

const RISK_CATEGORIES = [
  { value: "SLA_BREACH", label: "SLA Breach" },
  { value: "CONTRACT", label: "Contract" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "OPERATIONAL", label: "Operational" },
  { value: "SECURITY", label: "Security" },
];

const RISK_STATUSES = [
  { value: "OPEN", label: "Open" },
  { value: "MITIGATING", label: "Mitigating" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "ACCEPTED", label: "Accepted" },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  OPEN: {
    label: "Open",
    className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
  },
  MITIGATING: {
    label: "Mitigating",
    className:
      "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
  },
  RESOLVED: {
    label: "Resolved",
    className:
      "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  },
  ACCEPTED: {
    label: "Accepted",
    className: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100",
  },
};

const CATEGORY_CONFIG: Record<string, { label: string; className: string }> = {
  SLA_BREACH: {
    label: "SLA Breach",
    className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50",
  },
  CONTRACT: {
    label: "Contract",
    className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
  },
  DELIVERY: {
    label: "Delivery",
    className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
  },
  FINANCIAL: {
    label: "Financial",
    className:
      "bg-green-50 text-green-700 border-green-200 hover:bg-green-50",
  },
  OPERATIONAL: {
    label: "Operational",
    className:
      "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50",
  },
  SECURITY: {
    label: "Security",
    className: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50",
  },
};

function getRiskScoreBadgeClasses(score: number): string {
  if (score >= 15) return "bg-red-100 text-red-700 border-red-200";
  if (score >= 8) return "bg-orange-100 text-orange-700 border-orange-200";
  if (score >= 4) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-green-100 text-green-700 border-green-200";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function RiskHeatmapPage() {
  const searchParams = useSearchParams();
  const urlVendorId = searchParams.get("vendorId") || "";

  // State
  const [selectedCell, setSelectedCell] = useState<{
    probability: number;
    impact: number;
  } | undefined>(undefined);
  const [selectedRisk, setSelectedRisk] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Filters
  const [vendorFilter, setVendorFilter] = useState(urlVendorId);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Fetch risks
  const risksQuery = useQuery({
    queryKey: ["risks", vendorFilter, categoryFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (vendorFilter) params.set("vendorId", vendorFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/risks?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch risks");
      return res.json();
    },
    staleTime: 15000,
  });

  // Fetch vendors for filter dropdown
  const vendorsQuery = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await fetch("/api/vendors?limit=100");
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json();
    },
  });

  const risks = risksQuery.data?.risks || [];
  const vendors = vendorsQuery.data?.vendors || [];

  // Compute summary stats
  const stats = useMemo(() => {
    const total = risks.length;
    const critical = risks.filter((r: any) => r.riskScore >= 16).length;
    const mitigating = risks.filter((r: any) => r.status === "MITIGATING").length;
    const resolved = risks.filter((r: any) => r.status === "RESOLVED").length;
    return { total, critical, mitigating, resolved };
  }, [risks]);

  // Filter risks for the list below heatmap
  const filteredListRisks = useMemo(() => {
    if (!selectedCell) return risks;
    return risks.filter(
      (r: any) =>
        r.probability === selectedCell.probability &&
        r.impact === selectedCell.impact
    );
  }, [risks, selectedCell]);

  const handleCellClick = (probability: number, impact: number) => {
    // Toggle cell selection
    if (
      selectedCell?.probability === probability &&
      selectedCell?.impact === impact
    ) {
      setSelectedCell(undefined);
    } else {
      setSelectedCell({ probability, impact });
    }
  };

  const handleRiskClick = (risk: any) => {
    setSelectedRisk(risk);
    setDetailOpen(true);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setSelectedRisk(null);
  };

  const handleRiskUpdated = () => {
    risksQuery.refetch();
  };

  if (risksQuery.isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/vendors">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Risk Heatmap</h1>
            <p className="text-gray-600 mt-1">
              Portfolio-wide risk assessment
            </p>
          </div>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Risk
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Risks
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.total}
            </div>
            <p className="text-sm text-gray-500 mt-1">across portfolio</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Critical
            </CardTitle>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stats.critical > 0 ? "bg-red-50" : "bg-green-50"
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 ${
                  stats.critical > 0 ? "text-red-600" : "text-green-600"
                }`}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.critical}
            </div>
            <p
              className={`text-sm mt-1 ${
                stats.critical > 0
                  ? "text-red-600 font-medium"
                  : "text-gray-500"
              }`}
            >
              {stats.critical > 0 ? "score >= 16" : "No critical risks"}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Mitigating
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Activity className="w-4 h-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.mitigating}
            </div>
            <p className="text-sm text-gray-500 mt-1">in progress</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Resolved
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.resolved}
            </div>
            <p className="text-sm text-gray-500 mt-1">mitigated</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Filters:</span>
        <Select
          value={vendorFilter || "all"}
          onValueChange={(v) => setVendorFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[180px] bg-white border-gray-300 h-9">
            <SelectValue placeholder="All Vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map((vendor: any) => (
              <SelectItem key={vendor.id} value={vendor.id}>
                {vendor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={categoryFilter || "all"}
          onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[160px] bg-white border-gray-300 h-9">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {RISK_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[150px] bg-white border-gray-300 h-9">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {RISK_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(vendorFilter || categoryFilter || statusFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setVendorFilter("");
              setCategoryFilter("");
              setStatusFilter("");
            }}
            className="text-gray-500 h-9"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-500" />
            Risk Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          {risks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <Shield className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No risks found
              </h3>
              <p className="text-gray-500 max-w-md mb-4">
                {vendorFilter || categoryFilter || statusFilter
                  ? "No risks match the current filters. Try adjusting your filters or add a new risk."
                  : "Start tracking risks by adding your first risk entry."}
              </p>
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Risk
              </Button>
            </div>
          ) : (
            <RiskHeatmap
              risks={risks}
              selectedCell={selectedCell}
              onCellClick={handleCellClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Risk List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            {selectedCell
              ? `Risks at Probability ${selectedCell.probability}, Impact ${selectedCell.impact}`
              : "All Risks"}
            {filteredListRisks.length > 0 && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredListRisks.length})
              </span>
            )}
          </CardTitle>
          {selectedCell && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCell(undefined)}
              className="text-gray-500"
            >
              Show All
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {filteredListRisks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              {selectedCell
                ? "No risks in this cell."
                : "No risks to display."}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredListRisks.map((risk: any) => {
                const statusConf = STATUS_CONFIG[risk.status] || {
                  label: risk.status,
                  className:
                    "bg-gray-100 text-gray-700 border-gray-200",
                };
                const categoryConf = CATEGORY_CONFIG[risk.category] || {
                  label: risk.category,
                  className: "bg-gray-50 text-gray-700 border-gray-200",
                };

                return (
                  <button
                    key={risk.id}
                    type="button"
                    onClick={() => handleRiskClick(risk)}
                    className="w-full text-left p-4 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {risk.title}
                        </p>

                        {/* Probability x Impact = Score */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span>
                            P:{risk.probability} x I:{risk.impact} ={" "}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs font-bold ${getRiskScoreBadgeClasses(risk.riskScore)}`}
                          >
                            {risk.riskScore}
                          </Badge>
                        </div>

                        {/* Description preview */}
                        {risk.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {risk.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          {risk.vendor && (
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              {risk.vendor.name}
                            </span>
                          )}
                          {risk.createdBy && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {risk.createdBy.name || "Unknown"}
                            </span>
                          )}
                          {risk.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(risk.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={categoryConf.className}
                        >
                          {categoryConf.label}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={statusConf.className}
                        >
                          {statusConf.label}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Panel */}
      <RiskDetailPanel
        risk={selectedRisk}
        open={detailOpen}
        onClose={handleDetailClose}
        onUpdate={handleRiskUpdated}
      />

      {/* Create Dialog */}
      <CreateRiskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => risksQuery.refetch()}
        defaultVendorId={urlVendorId || undefined}
      />
    </div>
  );
}
