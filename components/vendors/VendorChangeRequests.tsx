"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, ArrowRight, User, Calendar } from "lucide-react";

interface VendorChangeRequestsProps {
  vendorId: string;
  changeRequests: any[];
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
    className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  },
  IMPLEMENTED: {
    label: "Implemented",
    className: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
  },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  CRITICAL: {
    label: "Critical",
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  },
  HIGH: {
    label: "High",
    className: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
  },
  MEDIUM: {
    label: "Medium",
    className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
  LOW: {
    label: "Low",
    className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function VendorChangeRequests({
  vendorId,
  changeRequests,
}: VendorChangeRequestsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Change Requests ({changeRequests.length})
        </h3>
        <div className="flex items-center gap-2">
          <Link href="/vendors/change-requests">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link href={`/vendors/change-requests?vendorId=${vendorId}`}>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              New Change Request
            </Button>
          </Link>
        </div>
      </div>

      {changeRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 bg-gray-100 rounded-full mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-medium text-gray-900 mb-1">
            No change requests
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Create a change request to track modifications to this vendor
          </p>
          <Link href={`/vendors/change-requests?vendorId=${vendorId}`}>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1.5" />
              Create First Change Request
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {changeRequests.map((cr: any) => {
            const status = statusConfig[cr.status] || {
              label: cr.status,
              className: "bg-gray-100 text-gray-700 border-gray-200",
            };
            const priority = priorityConfig[cr.priority] || {
              label: cr.priority,
              className: "bg-gray-100 text-gray-700 border-gray-200",
            };

            return (
              <div
                key={cr.id}
                className="p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {cr.title}
                    </p>
                    {cr.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {cr.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {cr.createdBy && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {cr.createdBy.name || cr.createdBy.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(cr.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                    <Badge variant="outline" className={priority.className}>
                      {priority.label}
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
