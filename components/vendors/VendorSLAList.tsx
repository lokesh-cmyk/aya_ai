"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface VendorSLAListProps {
  vendorId: string;
  slas: any[];
}

function getSLAStatusBadge(status: string) {
  switch (status) {
    case "MET":
      return (
        <Badge
          variant="outline"
          className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100"
        >
          Met
        </Badge>
      );
    case "AT_RISK":
      return (
        <Badge
          variant="outline"
          className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100"
        >
          At Risk
        </Badge>
      );
    case "BREACHED":
      return (
        <Badge
          variant="outline"
          className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100"
        >
          Breached
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      );
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function VendorSLAList({ vendorId, slas }: VendorSLAListProps) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    metric: "",
    target: "",
  });

  const addSLAMutation = useMutation({
    mutationFn: async (data: { name: string; metric: string; target: string }) => {
      const res = await fetch(`/api/vendors/${vendorId}/slas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add SLA");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", vendorId] });
      setShowAddDialog(false);
      setFormData({ name: "", metric: "", target: "" });
      toast.success("SLA added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.metric || !formData.target) {
      toast.error("Please fill in all required fields");
      return;
    }
    addSLAMutation.mutate(formData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Service Level Agreements ({slas.length})
        </h3>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add SLA
        </Button>
      </div>

      {slas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 bg-gray-100 rounded-full mb-4">
            <ShieldCheck className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-medium text-gray-900 mb-1">No SLAs defined</p>
          <p className="text-sm text-gray-500 mb-4">
            Add service level agreements to track vendor performance
          </p>
          <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add First SLA
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Measured</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slas.map((sla: any) => (
                <TableRow key={sla.id}>
                  <TableCell className="font-medium">{sla.name}</TableCell>
                  <TableCell className="text-gray-600">{sla.metric}</TableCell>
                  <TableCell className="text-gray-600">{sla.target}</TableCell>
                  <TableCell className="text-gray-600">
                    {sla.currentValue || "--"}
                  </TableCell>
                  <TableCell>{getSLAStatusBadge(sla.status)}</TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {formatDate(sla.lastMeasuredAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add SLA Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add SLA</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sla-name">Name *</Label>
              <Input
                id="sla-name"
                placeholder="e.g., Uptime Guarantee"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sla-metric">Metric *</Label>
              <Input
                id="sla-metric"
                placeholder="e.g., Uptime Percentage"
                value={formData.metric}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, metric: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sla-target">Target *</Label>
              <Input
                id="sla-target"
                placeholder="e.g., 99.9%"
                value={formData.target}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, target: e.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addSLAMutation.isPending}>
                {addSLAMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Add SLA
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
