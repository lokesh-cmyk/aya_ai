"use client";

import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  ONBOARDING: {
    label: "Onboarding",
    className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
  },
  ACTIVE: {
    label: "Active",
    className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  },
  INACTIVE: {
    label: "Inactive",
    className: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100",
  },
  OFFBOARDING: {
    label: "Offboarding",
    className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
};

export function VendorStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100",
  };

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
