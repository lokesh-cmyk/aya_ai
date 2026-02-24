"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Trash2 } from "lucide-react";

interface CreatePlaybookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface StepForm {
  title: string;
  description: string;
}

const RISK_CATEGORIES = [
  { value: "SLA_BREACH", label: "SLA Breach" },
  { value: "CONTRACT", label: "Contract" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "OPERATIONAL", label: "Operational" },
  { value: "SECURITY", label: "Security" },
];

const emptyStep = (): StepForm => ({
  title: "",
  description: "",
});

export function CreatePlaybookDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePlaybookDialogProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [triggerCondition, setTriggerCondition] = useState("");
  const [steps, setSteps] = useState<StepForm[]>([emptyStep()]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("");
    setTriggerCondition("");
    setSteps([emptyStep()]);
  };

  const createPlaybookMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/playbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create playbook");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const handleSubmit = () => {
    const validSteps = steps
      .filter((s) => s.title.trim())
      .map((s, index) => ({
        title: s.title.trim(),
        description: s.description.trim(),
        order: index + 1,
      }));

    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      triggerCondition: triggerCondition.trim() || undefined,
      steps: validSteps,
    };

    createPlaybookMutation.mutate(payload);
  };

  const addStep = () => {
    setSteps([...steps, emptyStep()]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof StepForm, value: string) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const updated = [...steps];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSteps(updated);
  };

  const canSubmit = name.trim() && category && steps.some((s) => s.title.trim());

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Playbook</DialogTitle>
          <DialogDescription>
            Define a new mitigation playbook with steps for your team.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="playbook-name" className="text-gray-700 font-medium">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="playbook-name"
              placeholder="e.g. SLA Breach Response Plan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white border-gray-300"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label
              htmlFor="playbook-description"
              className="text-gray-700 font-medium"
            >
              Description
            </Label>
            <Textarea
              id="playbook-description"
              placeholder="Describe the purpose of this playbook..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white border-gray-300 min-h-[80px]"
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

          {/* Trigger Condition */}
          <div className="space-y-2">
            <Label
              htmlFor="playbook-trigger"
              className="text-gray-700 font-medium"
            >
              Trigger Condition
            </Label>
            <Input
              id="playbook-trigger"
              placeholder="e.g. When SLA breach is detected for uptime metric"
              value={triggerCondition}
              onChange={(e) => setTriggerCondition(e.target.value)}
              className="bg-white border-gray-300"
            />
          </div>

          {/* Steps */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-gray-700 font-medium">
                Steps <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStep}
                className="border-dashed border-gray-300 text-gray-600"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Step
              </Button>
            </div>

            {steps.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                No steps added yet. Click &quot;Add Step&quot; to define playbook
                steps.
              </p>
            )}

            {steps.map((step, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-3 space-y-2 mb-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveStep(index, "up")}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed p-0 h-3"
                        title="Move up"
                      >
                        <svg
                          width="10"
                          height="6"
                          viewBox="0 0 10 6"
                          fill="currentColor"
                        >
                          <path d="M5 0L10 6H0L5 0Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(index, "down")}
                        disabled={index === steps.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed p-0 h-3"
                        title="Move down"
                      >
                        <svg
                          width="10"
                          height="6"
                          viewBox="0 0 10 6"
                          fill="currentColor"
                        >
                          <path d="M5 6L0 0H10L5 6Z" />
                        </svg>
                      </button>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      Step {index + 1}
                    </span>
                  </div>
                  {steps.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStep(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. Notify account manager"
                      value={step.title}
                      onChange={(e) =>
                        updateStep(index, "title", e.target.value)
                      }
                      className="bg-white border-gray-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Description</Label>
                    <Textarea
                      placeholder="Describe what should happen in this step..."
                      value={step.description}
                      onChange={(e) =>
                        updateStep(index, "description", e.target.value)
                      }
                      className="bg-white border-gray-300 min-h-[60px]"
                    />
                  </div>
                </div>
              </div>
            ))}
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
            disabled={!canSubmit || createPlaybookMutation.isPending}
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {createPlaybookMutation.isPending
              ? "Creating..."
              : "Create Playbook"}
          </Button>
        </DialogFooter>

        {createPlaybookMutation.isError && (
          <p className="text-sm text-red-600 text-center">
            {createPlaybookMutation.error?.message ||
              "Failed to create playbook"}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
