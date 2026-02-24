"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Handshake,
  AlertTriangle,
  FileText,
  Shield,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
} from "lucide-react";
import Link from "next/link";

interface UpcomingRenewal {
  id: string;
  name: string;
  renewalDate: string;
  renewalType: string;
  status: string;
}

interface RecentChangeRequest {
  id: string;
  title: string;
  status: string;
  priority: string;
  vendor: { name: string };
  createdBy: { name: string };
  createdAt: string;
}

interface RecentRisk {
  id: string;
  title: string;
  riskScore: number;
  category: string;
  status: string;
  vendor: { name: string };
  createdAt: string;
}

interface VendorStats {
  totalVendors: number;
  activeVendors: number;
  totalSLAs: number;
  slaBreaches: number;
  openChangeRequests: number;
  highRisks: number;
  upcomingRenewals: UpcomingRenewal[];
  recentChangeRequests: RecentChangeRequest[];
  recentRisks: RecentRisk[];
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getRenewalBadgeClasses(days: number): string {
  if (days < 7) return "bg-red-100 text-red-700 border-red-200";
  if (days < 14) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-green-100 text-green-700 border-green-200";
}

function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case "DRAFT":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "SUBMITTED":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "UNDER_REVIEW":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "APPROVED":
      return "bg-green-100 text-green-700 border-green-200";
    case "REJECTED":
      return "bg-red-100 text-red-700 border-red-200";
    case "IMPLEMENTED":
      return "bg-purple-100 text-purple-700 border-purple-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function getPriorityBadgeClasses(priority: string): string {
  switch (priority) {
    case "CRITICAL":
      return "bg-red-100 text-red-700 border-red-200";
    case "HIGH":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "MEDIUM":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "LOW":
      return "bg-green-100 text-green-700 border-green-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function getRiskScoreBadgeClasses(score: number): string {
  if (score >= 16) return "bg-red-100 text-red-700 border-red-200";
  if (score >= 8) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-green-100 text-green-700 border-green-200";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-56 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-32" />
          ))}
        </div>
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sections skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Vendor Tracker
        </h1>
        <p className="text-gray-600">
          Manage vendor relationships, SLAs, and change requests
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <Handshake className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No vendors yet
          </h3>
          <p className="text-gray-500 text-center max-w-md mb-6">
            Start tracking your vendor relationships by adding your first
            vendor. Monitor SLAs, manage change requests, and assess risks all
            in one place.
          </p>
          <Link href="/vendors/list">
            <Button>
              <Handshake className="w-4 h-4 mr-2" />
              Add Your First Vendor
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VendorDashboardPage() {
  const { data: stats, isLoading } = useQuery<VendorStats>({
    queryKey: ["vendor-stats"],
    queryFn: async () => {
      const res = await fetch("/api/vendors/stats");
      if (!res.ok) throw new Error("Failed to fetch vendor stats");
      return res.json();
    },
    staleTime: 30000,
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!stats || stats.totalVendors === 0) {
    return <EmptyState />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Vendor Tracker
          </h1>
          <p className="text-gray-600">
            Manage vendor relationships, SLAs, and change requests
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/vendors/list">
            <Button variant="outline" size="sm">
              <Handshake className="w-4 h-4 mr-1.5" />
              Vendor List
            </Button>
          </Link>
          <Link href="/vendors/change-requests">
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-1.5" />
              Change Requests
            </Button>
          </Link>
          <Link href="/vendors/risks">
            <Button variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-1.5" />
              Risk Heatmap
            </Button>
          </Link>
          <Link href="/vendors/playbooks">
            <Button variant="outline" size="sm">
              <Activity className="w-4 h-4 mr-1.5" />
              Playbooks
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Vendors */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Vendors
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Handshake className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.totalVendors}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {stats.activeVendors} active
            </p>
          </CardContent>
        </Card>

        {/* SLA Health */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              SLA Health
            </CardTitle>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stats.slaBreaches > 0 ? "bg-red-50" : "bg-green-50"
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 ${
                  stats.slaBreaches > 0 ? "text-red-600" : "text-green-600"
                }`}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.totalSLAs}
            </div>
            <p
              className={`text-sm mt-1 ${
                stats.slaBreaches > 0 ? "text-red-600 font-medium" : "text-gray-500"
              }`}
            >
              {stats.slaBreaches > 0
                ? `${stats.slaBreaches} breach${stats.slaBreaches !== 1 ? "es" : ""}`
                : "No breaches"}
            </p>
          </CardContent>
        </Card>

        {/* Open Change Requests */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Open Change Requests
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.openChangeRequests}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              pending review
            </p>
          </CardContent>
        </Card>

        {/* High Risks */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              High Risks
            </CardTitle>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stats.highRisks > 0 ? "bg-red-50" : "bg-green-50"
              }`}
            >
              <Shield
                className={`w-4 h-4 ${
                  stats.highRisks > 0 ? "text-red-600" : "text-green-600"
                }`}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.highRisks}
            </div>
            <p
              className={`text-sm mt-1 ${
                stats.highRisks > 0 ? "text-red-600 font-medium" : "text-gray-500"
              }`}
            >
              {stats.highRisks > 0
                ? `score >= 16`
                : "All clear"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detail Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Renewals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-gray-500" />
              Upcoming Renewals
            </CardTitle>
            <Link href="/vendors/list?filter=renewal">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.upcomingRenewals.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No renewals in the next 30 days
              </p>
            ) : (
              <div className="space-y-3">
                {stats.upcomingRenewals.map((vendor) => {
                  const days = getDaysUntil(vendor.renewalDate);
                  return (
                    <div
                      key={vendor.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/vendors/${vendor.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {vendor.name}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(vendor.renewalDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={getRenewalBadgeClasses(days)}
                        >
                          {days} day{days !== 1 ? "s" : ""}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {vendor.renewalType}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Change Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-gray-500" />
              Recent Change Requests
            </CardTitle>
            <Link href="/vendors/change-requests">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentChangeRequests.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No change requests yet
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentChangeRequests.map((cr) => (
                  <Link
                    key={cr.id}
                    href={`/vendors/change-requests?id=${cr.id}`}
                    className="block"
                  >
                    <div className="flex items-start justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {cr.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {cr.vendor.name} &middot;{" "}
                          {formatDate(cr.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <Badge
                          variant="outline"
                          className={getStatusBadgeClasses(cr.status)}
                        >
                          {formatStatusLabel(cr.status)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={getPriorityBadgeClasses(cr.priority)}
                        >
                          {cr.priority}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Risks */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-gray-500" />
              Recent Risks
            </CardTitle>
            <Link href="/vendors/risks">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentRisks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No risks recorded yet
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stats.recentRisks.map((risk) => (
                  <div
                    key={risk.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {risk.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {risk.vendor.name} &middot;{" "}
                        {formatDate(risk.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge
                        variant="outline"
                        className={getRiskScoreBadgeClasses(risk.riskScore)}
                      >
                        Score: {risk.riskScore}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {formatStatusLabel(risk.category)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={getStatusBadgeClasses(risk.status)}
                      >
                        {formatStatusLabel(risk.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
