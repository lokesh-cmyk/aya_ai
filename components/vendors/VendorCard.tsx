"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { VendorStatusBadge } from "@/components/vendors/VendorStatusBadge";
import { CalendarDays, AlertTriangle, FileText } from "lucide-react";

interface VendorCardProps {
  vendor: any;
  onClick?: () => void;
}

const categoryGradients: Record<string, string> = {
  SaaS: "from-blue-500 to-cyan-500",
  Consulting: "from-purple-500 to-pink-500",
  Infrastructure: "from-orange-500 to-red-500",
  Hardware: "from-slate-500 to-gray-600",
  Services: "from-green-500 to-emerald-500",
  Other: "from-indigo-500 to-violet-500",
};

export function VendorCard({ vendor, onClick }: VendorCardProps) {
  const router = useRouter();

  const gradient =
    categoryGradients[vendor.category] || categoryGradients.Other;

  // SLA health counts
  const slas = vendor.slas || [];
  const slaCounts = {
    breached: slas.filter((s: any) => s.status === "BREACHED").length,
    atRisk: slas.filter((s: any) => s.status === "AT_RISK").length,
    met: slas.filter((s: any) => s.status === "MET").length,
  };

  const changeRequestCount = vendor._count?.changeRequests || 0;

  const contractEnd = vendor.contractEnd
    ? new Date(vendor.contractEnd)
    : null;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/vendors/${vendor.id}`);
    }
  };

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold text-lg shrink-0`}
          >
            {vendor.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{vendor.name}</CardTitle>
            <CardDescription className="truncate">
              {vendor.category || "Uncategorized"}
            </CardDescription>
          </div>
          <VendorStatusBadge status={vendor.status || "ACTIVE"} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Contract end date */}
          {contractEnd && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>
                Expires{" "}
                {contractEnd.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}

          {/* SLA health */}
          {slas.length > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <AlertTriangle className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex items-center gap-2">
                {slaCounts.breached > 0 && (
                  <span className="text-red-600 font-medium">
                    {slaCounts.breached} breached
                  </span>
                )}
                {slaCounts.atRisk > 0 && (
                  <span className="text-amber-600 font-medium">
                    {slaCounts.atRisk} at risk
                  </span>
                )}
                {slaCounts.met > 0 && (
                  <span className="text-green-600 font-medium">
                    {slaCounts.met} met
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Change requests */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="w-4 h-4 shrink-0" />
            <span>
              {changeRequestCount} open change{" "}
              {changeRequestCount === 1 ? "request" : "requests"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
