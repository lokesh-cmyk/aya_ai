"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ChangeRequestKanban } from "@/components/vendors/ChangeRequestKanban";
import { CreateChangeRequestDialog } from "@/components/vendors/CreateChangeRequestDialog";

const PRIORITIES = [
  { value: "ALL", label: "All Priorities" },
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export default function ChangeRequestsPage() {
  const searchParams = useSearchParams();
  const defaultVendorId = searchParams.get("vendorId") || "";

  const [vendorFilter, setVendorFilter] = useState(defaultVendorId);
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);

  // Fetch vendors for filter dropdown
  const { data: vendorsData } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await fetch("/api/vendors?limit=100");
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json();
    },
  });

  const vendors = vendorsData?.vendors || [];

  // Build query params for change requests
  const queryParams = new URLSearchParams();
  if (vendorFilter) queryParams.set("vendorId", vendorFilter);
  if (priorityFilter && priorityFilter !== "ALL")
    queryParams.set("priority", priorityFilter);
  queryParams.set("limit", "200");

  // Fetch change requests
  const {
    data: crData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "change-requests",
      vendorFilter,
      priorityFilter,
    ],
    queryFn: async () => {
      const res = await fetch(
        `/api/change-requests?${queryParams.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch change requests");
      return res.json();
    },
  });

  const changeRequests = crData?.changeRequests || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/vendors">
            <Button variant="ghost" size="sm" className="p-1.5">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-gray-500" />
              Change Requests
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Track and manage vendor change requests across your team
            </p>
          </div>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Change Request
        </Button>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={vendorFilter || "ALL"}
          onValueChange={(val) => setVendorFilter(val === "ALL" ? "" : val)}
        >
          <SelectTrigger className="w-[200px] bg-white border-gray-300">
            <SelectValue placeholder="All Vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Vendors</SelectItem>
            {vendors.map((v: any) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px] bg-white border-gray-300">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(vendorFilter || priorityFilter !== "ALL") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setVendorFilter("");
              setPriorityFilter("ALL");
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            Clear filters
          </Button>
        )}

        <span className="text-sm text-gray-400 ml-auto">
          {changeRequests.length} change request
          {changeRequests.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="w-[280px] shrink-0 space-y-3">
              <Skeleton className="h-10 w-full rounded-t-lg" />
              <div className="space-y-2 p-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : changeRequests.length === 0 && !vendorFilter && priorityFilter === "ALL" ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 bg-gray-100 rounded-full mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No change requests yet
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md">
            Create your first change request to start tracking vendor
            modifications, contract amendments, and scope adjustments.
          </p>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create First Change Request
          </Button>
        </div>
      ) : (
        <ChangeRequestKanban
          changeRequests={changeRequests}
          onRefresh={() => refetch()}
        />
      )}

      {/* Create dialog */}
      <CreateChangeRequestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => refetch()}
        defaultVendorId={defaultVendorId || undefined}
      />
    </div>
  );
}
