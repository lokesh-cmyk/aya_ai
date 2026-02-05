"use client";

import { useState, useEffect } from "react";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/ui/star-rating";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { PrioritySelector } from "@/components/ui/priority-selector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TaskPriority } from "@/app/generated/prisma/enums";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  taskListId: string;
  defaultStatusId?: string;
}

export function CreateTaskModal({
  open,
  onClose,
  taskListId,
  defaultStatusId,
}: CreateTaskModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    statusId: defaultStatusId || "",
    priority: "NORMAL" as TaskPriority,
    progress: 0,
    complexity: 3,
    dueDate: undefined as Date | undefined,
  });

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setFormData({
        name: "",
        description: "",
        statusId: defaultStatusId || "",
        priority: "NORMAL",
        progress: 0,
        complexity: 3,
        dueDate: undefined,
      });
    }
  }, [open, defaultStatusId]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/crm/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          taskListId,
          statusId: data.statusId && data.statusId.trim() ? data.statusId : null,
          dueDate: data.dueDate ? data.dueDate.toISOString() : null,
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to create task");
      }
      return res.json();
    },
    onSuccess: () => {
      onClose();
      setFormData({
        name: "",
        description: "",
        statusId: defaultStatusId || "",
        priority: "NORMAL",
        progress: 0,
        complexity: 3,
        dueDate: undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["crm-tasks", taskListId] });
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
    },
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto glass-dark rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">Create Task</DialogTitle>
          <DialogDescription className="text-gray-500">
            Add a new task to this list
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="task-name" className="text-gray-700 font-medium text-sm">Task Name *</Label>
            <Input
              id="task-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter task name"
              className="bg-white/80 backdrop-blur-sm border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description" className="text-gray-700 font-medium text-sm">Description</Label>
            <Textarea
              id="task-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task description"
              className="bg-white/80 backdrop-blur-sm border-gray-200 text-gray-900 min-h-[100px] resize-none rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-gray-700 font-medium text-sm">Priority</Label>
            <PrioritySelector
              value={formData.priority}
              onChange={(priority) => setFormData({ ...formData, priority })}
              layout="horizontal"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label className="text-gray-700 font-medium text-sm">Progress</Label>
              <ProgressBar
                value={formData.progress}
                onChange={(val) => setFormData({ ...formData, progress: val })}
                editable={true}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-gray-700 font-medium text-sm">Complexity</Label>
              <StarRating
                value={formData.complexity}
                onChange={(val) => setFormData({ ...formData, complexity: val })}
                max={5}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium text-sm">Due Date</Label>
            <DatePickerPopover
              value={formData.dueDate}
              onChange={(date) => setFormData({ ...formData, dueDate: date })}
              placeholder="Select due date"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name.trim() || createMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm shadow-blue-600/20"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Task"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
