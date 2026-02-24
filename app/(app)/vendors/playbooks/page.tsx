"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, BookOpen } from "lucide-react";
import { PlaybookCard } from "@/components/vendors/PlaybookCard";
import { PlaybookDetailDialog } from "@/components/vendors/PlaybookDetailDialog";
import { CreatePlaybookDialog } from "@/components/vendors/CreatePlaybookDialog";

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "All Categories" },
  { value: "SLA_BREACH", label: "SLA Breach" },
  { value: "CONTRACT", label: "Contract" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "OPERATIONAL", label: "Operational" },
  { value: "SECURITY", label: "Security" },
];

const TYPE_OPTIONS = [
  { value: "ALL", label: "All Types" },
  { value: "SYSTEM", label: "System" },
  { value: "CUSTOM", label: "Custom" },
];

const ACTIVE_OPTIONS = [
  { value: "ALL", label: "All Status" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export default function PlaybookLibraryPage() {
  const queryClient = useQueryClient();

  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPlaybook, setSelectedPlaybook] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Fetch playbooks
  const { data: playbooksData, isLoading } = useQuery({
    queryKey: ["playbooks", categoryFilter, activeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter && categoryFilter !== "ALL")
        params.append("category", categoryFilter);
      if (activeFilter === "ACTIVE") params.append("active", "true");
      if (activeFilter === "INACTIVE") params.append("active", "false");
      const res = await fetch(`/api/playbooks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch playbooks");
      return res.json();
    },
    staleTime: 30000,
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: string;
      isActive: boolean;
    }) => {
      const res = await fetch(`/api/playbooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update playbook");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
    },
  });

  const allPlaybooks = playbooksData?.playbooks || [];

  // Client-side type filter (API doesn't support it directly)
  const playbooks = allPlaybooks.filter((p: any) => {
    if (typeFilter === "SYSTEM") return p.isSystemProvided;
    if (typeFilter === "CUSTOM") return !p.isSystemProvided;
    return true;
  });

  const handleToggle = (id: string, active: boolean) => {
    toggleMutation.mutate({ id, isActive: active });
  };

  const handleCardClick = (playbook: any) => {
    setSelectedPlaybook(playbook);
    setDetailDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Playbook Library
          </h1>
          <p className="text-gray-600">
            Pre-built and custom mitigation playbooks
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Playbook
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] bg-white border-gray-300">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px] bg-white border-gray-300">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-[180px] bg-white border-gray-300">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            {ACTIVE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Playbook grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : playbooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-gray-500 mb-4">No playbooks found</p>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Playbook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playbooks.map((playbook: any) => (
            <PlaybookCard
              key={playbook.id}
              playbook={playbook}
              onToggle={handleToggle}
              onClick={() => handleCardClick(playbook)}
            />
          ))}
        </div>
      )}

      {/* Create Playbook Dialog */}
      <CreatePlaybookDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Playbook Detail Dialog */}
      {selectedPlaybook && (
        <PlaybookDetailDialog
          playbook={selectedPlaybook}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />
      )}
    </div>
  );
}
