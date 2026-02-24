"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateChangeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultVendorId?: string;
}

const PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export function CreateChangeRequestDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultVendorId,
}: CreateChangeRequestDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [vendorId, setVendorId] = useState(defaultVendorId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Step 2 fields
  const [requestedChange, setRequestedChange] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [requestedBy, setRequestedBy] = useState("");

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

  const resetForm = () => {
    setStep(1);
    setVendorId(defaultVendorId || "");
    setTitle("");
    setDescription("");
    setRequestedChange("");
    setPriority("NORMAL");
    setRequestedBy("");
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create change request");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change-requests"] });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const handleSubmit = () => {
    const payload: Record<string, unknown> = {
      vendorId,
      title,
      description: description || undefined,
      priority,
      requestedBy: requestedBy || undefined,
      requestedChange: requestedChange
        ? { description: requestedChange }
        : undefined,
    };

    createMutation.mutate(payload);
  };

  const canProceedStep1 = vendorId.trim() && title.trim();
  const canSubmit = canProceedStep1;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "New Change Request - Details"}
            {step === 2 && "New Change Request - Change Info"}
          </DialogTitle>
          <DialogDescription>
            Step {step} of 2 &mdash;{" "}
            {step === 1 && "Select a vendor and describe the change request."}
            {step === 2 &&
              "Provide change details, priority, and requester."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 pb-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Vendor, Title, Description */}
        {step === 1 && (
          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                Vendor <span className="text-red-500">*</span>
              </Label>
              <Select
                value={vendorId}
                onValueChange={setVendorId}
              >
                <SelectTrigger className="w-full bg-white border-gray-300">
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cr-title" className="text-gray-700 font-medium">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cr-title"
                placeholder="e.g., Extend contract by 6 months"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="cr-description"
                className="text-gray-700 font-medium"
              >
                Description
              </Label>
              <Textarea
                id="cr-description"
                placeholder="Brief summary of why this change is needed..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white border-gray-300"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 2: Change details, Priority, Requested By */}
        {step === 2 && (
          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label
                htmlFor="cr-change"
                className="text-gray-700 font-medium"
              >
                Requested Change
              </Label>
              <Textarea
                id="cr-change"
                placeholder="Describe the specific changes being requested (new terms, scope adjustments, timeline changes, etc.)..."
                value={requestedChange}
                onChange={(e) => setRequestedChange(e.target.value)}
                className="bg-white border-gray-300"
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full bg-white border-gray-300">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="cr-requester"
                className="text-gray-700 font-medium"
              >
                Requested By
              </Label>
              <Input
                id="cr-requester"
                placeholder="Name of the person requesting this change"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                className="bg-white border-gray-300"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter>
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="border-gray-300 text-gray-700"
            >
              Back
            </Button>
          )}
          {step === 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="border-gray-300 text-gray-700"
            >
              Cancel
            </Button>
          )}
          {step < 2 ? (
            <Button
              type="button"
              disabled={!canProceedStep1}
              onClick={() => setStep(step + 1)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!canSubmit || createMutation.isPending}
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createMutation.isPending
                ? "Creating..."
                : "Create Change Request"}
            </Button>
          )}
        </DialogFooter>

        {createMutation.isError && (
          <p className="text-sm text-red-600 text-center">
            {createMutation.error?.message || "Failed to create change request"}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
