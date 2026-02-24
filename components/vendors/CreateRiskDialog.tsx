"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface CreateRiskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultVendorId?: string;
}

const RISK_CATEGORIES = [
  { value: "SLA_BREACH", label: "SLA Breach" },
  { value: "CONTRACT", label: "Contract" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "OPERATIONAL", label: "Operational" },
  { value: "SECURITY", label: "Security" },
];

const PROBABILITY_OPTIONS = [
  { value: 1, label: "1 - Rare" },
  { value: 2, label: "2 - Unlikely" },
  { value: 3, label: "3 - Possible" },
  { value: 4, label: "4 - Likely" },
  { value: 5, label: "5 - Almost Certain" },
];

const IMPACT_OPTIONS = [
  { value: 1, label: "1 - Negligible" },
  { value: 2, label: "2 - Minor" },
  { value: 3, label: "3 - Moderate" },
  { value: 4, label: "4 - Major" },
  { value: 5, label: "5 - Catastrophic" },
];

function getScoreColor(score: number): string {
  if (score >= 15) return "bg-red-100 text-red-700 border-red-300";
  if (score >= 8) return "bg-orange-100 text-orange-700 border-orange-300";
  if (score >= 4) return "bg-yellow-100 text-yellow-700 border-yellow-300";
  return "bg-green-100 text-green-700 border-green-300";
}

function getScoreLabel(score: number): string {
  if (score >= 15) return "Critical";
  if (score >= 8) return "High";
  if (score >= 4) return "Medium";
  return "Low";
}

export function CreateRiskDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultVendorId,
}: CreateRiskDialogProps) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [probability, setProbability] = useState<number>(3);
  const [impact, setImpact] = useState<number>(3);
  const [vendorId, setVendorId] = useState(defaultVendorId || "");
  const [mitigationPlan, setMitigationPlan] = useState("");

  // Fetch vendors for dropdown
  const { data: vendorsData } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await fetch("/api/vendors?limit=100");
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json();
    },
    enabled: open,
  });

  const vendors = vendorsData?.vendors || [];
  const riskScore = probability * impact;

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setProbability(3);
    setImpact(3);
    setVendorId(defaultVendorId || "");
    setMitigationPlan("");
  };

  const createRiskMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/risks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create risk");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risks"] });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const handleSubmit = () => {
    const payload: Record<string, unknown> = {
      title,
      description: description || undefined,
      category,
      probability,
      impact,
      vendorId: vendorId || undefined,
      mitigationPlan: mitigationPlan || undefined,
    };

    createRiskMutation.mutate(payload);
  };

  const canSubmit = title.trim() && category && probability && impact;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Risk</DialogTitle>
          <DialogDescription>
            Create a new risk entry for your vendor portfolio.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="risk-title" className="text-gray-700 font-medium">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="risk-title"
              placeholder="e.g., Vendor delivery delay risk"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white border-gray-300"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Description</Label>
            <Textarea
              placeholder="Describe the risk in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-white border-gray-300"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full bg-white border-gray-300">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {RISK_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Probability and Impact side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                Probability <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(probability)}
                onValueChange={(v) => setProbability(Number(v))}
              >
                <SelectTrigger className="w-full bg-white border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROBABILITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                Impact <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(impact)}
                onValueChange={(v) => setImpact(Number(v))}
              >
                <SelectTrigger className="w-full bg-white border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPACT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Live Risk Score Preview */}
          <div className="flex items-center justify-center py-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-600">Risk Score:</span>
              <span className="font-medium text-gray-800">{probability}</span>
              <span className="text-gray-400">x</span>
              <span className="font-medium text-gray-800">{impact}</span>
              <span className="text-gray-400">=</span>
              <Badge
                variant="outline"
                className={`text-sm font-bold px-3 py-1 ${getScoreColor(riskScore)}`}
              >
                {riskScore} - {getScoreLabel(riskScore)}
              </Badge>
            </div>
          </div>

          {/* Vendor (optional) */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              Vendor{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger className="w-full bg-white border-gray-300">
                <SelectValue placeholder="Select a vendor (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No vendor</SelectItem>
                {vendors.map((vendor: any) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mitigation Plan */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              Mitigation Plan{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="Describe the mitigation strategy..."
              value={mitigationPlan}
              onChange={(e) => setMitigationPlan(e.target.value)}
              rows={3}
              className="bg-white border-gray-300"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-gray-300 text-gray-700"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || createRiskMutation.isPending}
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {createRiskMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                Creating...
              </>
            ) : (
              "Create Risk"
            )}
          </Button>
        </DialogFooter>

        {createRiskMutation.isError && (
          <p className="text-sm text-red-600 text-center">
            {createRiskMutation.error?.message || "Failed to create risk"}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
