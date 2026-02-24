"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Zap,
  ListChecks,
  Eye,
  ShieldCheck,
  Plus,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "All Categories" },
  { value: "SLA_BREACH", label: "SLA Breach" },
  { value: "CONTRACT", label: "Contract" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "OPERATIONAL", label: "Operational" },
  { value: "SECURITY", label: "Security" },
];

const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  SLA_BREACH: "bg-red-100 text-red-700 border-red-200",
  CONTRACT: "bg-blue-100 text-blue-700 border-blue-200",
  DELIVERY: "bg-amber-100 text-amber-700 border-amber-200",
  FINANCIAL: "bg-green-100 text-green-700 border-green-200",
  OPERATIONAL: "bg-purple-100 text-purple-700 border-purple-200",
  SECURITY: "bg-gray-100 text-gray-700 border-gray-200",
};

const CATEGORY_ICONS: Record<string, string> = {
  SLA_BREACH: "🔴",
  CONTRACT: "📄",
  DELIVERY: "🚚",
  FINANCIAL: "💰",
  OPERATIONAL: "⚙️",
  SECURITY: "🔒",
};

function formatCategoryLabel(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PlaybooksPage() {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedPlaybook, setSelectedPlaybook] = useState<any>(null);
  // Track which playbooks have been adopted (by name, since IDs differ across teams)
  const [adoptedNames, setAdoptedNames] = useState<Set<string>>(new Set());

  // Fetch global system playbooks
  const { data, isLoading } = useQuery({
    queryKey: ["playbook-library", categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter && categoryFilter !== "ALL")
        params.append("category", categoryFilter);
      const res = await fetch(`/api/playbooks/library?${params}`);
      if (!res.ok) throw new Error("Failed to fetch playbooks");
      return res.json();
    },
    staleTime: 60000,
  });

  // Fetch team's existing playbooks to know which are already adopted
  const { data: teamData } = useQuery({
    queryKey: ["playbooks"],
    queryFn: async () => {
      const res = await fetch("/api/playbooks");
      if (!res.ok) throw new Error("Failed to fetch team playbooks");
      return res.json();
    },
    staleTime: 30000,
  });

  const teamPlaybookNames = new Set(
    (teamData?.playbooks || [])
      .filter((p: any) => p.isSystemProvided)
      .map((p: any) => p.name)
  );

  // Adopt mutation
  const adoptMutation = useMutation({
    mutationFn: async (playbookId: string) => {
      const res = await fetch("/api/playbooks/adopt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbookId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to adopt playbook");
      }
      return res.json();
    },
    onSuccess: (_data, _vars) => {
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
    },
  });

  const handleAdopt = (playbook: any) => {
    adoptMutation.mutate(playbook.id, {
      onSuccess: () => {
        setAdoptedNames((prev) => new Set(prev).add(playbook.name));
      },
    });
  };

  const isAdopted = (playbook: any) =>
    teamPlaybookNames.has(playbook.name) || adoptedNames.has(playbook.name);

  const playbooks = data?.playbooks || [];

  // Group playbooks by category
  const grouped = playbooks.reduce((acc: Record<string, any[]>, p: any) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const steps = selectedPlaybook
    ? Array.isArray(selectedPlaybook.steps)
      ? [...selectedPlaybook.steps].sort(
          (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
        )
      : []
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Playbooks</h1>
            <p className="text-gray-600">
              Pre-built mitigation and response playbooks for vendor risk
              management
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px] bg-white border-gray-300">
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
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <ShieldCheck className="w-4 h-4" />
          <span>
            {playbooks.length} playbook{playbooks.length !== 1 ? "s" : ""}{" "}
            available
          </span>
        </div>
      </div>

      {/* Content */}
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
            <p className="text-gray-500">No playbooks found</p>
          </CardContent>
        </Card>
      ) : categoryFilter !== "ALL" ? (
        // Flat grid when filtered
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playbooks.map((playbook: any) => (
            <PlaybookLibraryCard
              key={playbook.id}
              playbook={playbook}
              adopted={isAdopted(playbook)}
              onAdopt={() => handleAdopt(playbook)}
              adopting={adoptMutation.isPending}
              onClick={() => setSelectedPlaybook(playbook)}
            />
          ))}
        </div>
      ) : (
        // Grouped by category
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">
                  {CATEGORY_ICONS[category] || "📋"}
                </span>
                <h2 className="text-lg font-semibold text-gray-900">
                  {formatCategoryLabel(category)}
                </h2>
                <Badge variant="outline" className="ml-1">
                  {(items as any[]).length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(items as any[]).map((playbook: any) => (
                  <PlaybookLibraryCard
                    key={playbook.id}
                    playbook={playbook}
                    adopted={isAdopted(playbook)}
                    onAdopt={() => handleAdopt(playbook)}
                    adopting={adoptMutation.isPending}
                    onClick={() => setSelectedPlaybook(playbook)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedPlaybook}
        onOpenChange={(open) => !open && setSelectedPlaybook(null)}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          {selectedPlaybook && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedPlaybook.name}
                </DialogTitle>
                <DialogDescription>
                  <span className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={
                        CATEGORY_BADGE_CLASSES[selectedPlaybook.category] ||
                        CATEGORY_BADGE_CLASSES.SECURITY
                      }
                    >
                      {formatCategoryLabel(selectedPlaybook.category)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-indigo-50 text-indigo-700 border-indigo-200"
                    >
                      System
                    </Badge>
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {selectedPlaybook.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">
                      Description
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedPlaybook.description}
                    </p>
                  </div>
                )}

                {selectedPlaybook.triggerCondition && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <Zap className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">
                        Trigger Condition
                      </h4>
                      <p className="text-sm text-amber-700 mt-0.5">
                        {selectedPlaybook.triggerCondition}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Steps ({steps.length})
                  </h4>
                  <div className="space-y-3">
                    {steps.map((step: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50"
                      >
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {step.title}
                          </p>
                          {step.description && (
                            <p className="text-sm text-gray-500 mt-0.5">
                              {step.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                {isAdopted(selectedPlaybook) ? (
                  <Button disabled className="bg-green-600 text-white">
                    <Check className="w-4 h-4 mr-2" />
                    Added to Your Team
                  </Button>
                ) : (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => handleAdopt(selectedPlaybook)}
                    disabled={adoptMutation.isPending}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {adoptMutation.isPending
                      ? "Adding..."
                      : "Use This Playbook"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlaybookLibraryCard({
  playbook,
  adopted,
  onAdopt,
  adopting,
  onClick,
}: {
  playbook: any;
  adopted: boolean;
  onAdopt: () => void;
  adopting: boolean;
  onClick: () => void;
}) {
  const categoryClasses =
    CATEGORY_BADGE_CLASSES[playbook.category] ||
    CATEGORY_BADGE_CLASSES.SECURITY;
  const steps = Array.isArray(playbook.steps) ? playbook.steps : [];

  return (
    <Card className="hover:shadow-lg transition-shadow flex flex-col">
      <div className="p-5 pb-3 cursor-pointer" onClick={onClick}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
            {playbook.name}
          </h3>
          <Badge variant="outline" className={categoryClasses}>
            {formatCategoryLabel(playbook.category)}
          </Badge>
        </div>
        {playbook.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mt-1.5">
            {playbook.description}
          </p>
        )}
      </div>
      <CardContent className="flex-1 flex flex-col justify-between gap-3 pt-0 px-5 pb-5">
        <div className="space-y-2 cursor-pointer" onClick={onClick}>
          {playbook.triggerCondition && (
            <div className="flex items-start gap-2 text-sm text-gray-500">
              <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
              <span className="line-clamp-1">{playbook.triggerCondition}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ListChecks className="w-3.5 h-3.5 shrink-0" />
            <span>
              {steps.length} step{steps.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClick}>
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            View
          </Button>
          {adopted ? (
            <Button
              size="sm"
              disabled
              className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-50"
              variant="outline"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Added
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={(e) => {
                e.stopPropagation();
                onAdopt();
              }}
              disabled={adopting}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Use
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
