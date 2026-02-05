"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TaskListType } from "@/app/generated/prisma/enums";

interface CreateTaskListModalProps {
  open: boolean;
  onClose: () => void;
  spaceId: string;
  folderId?: string;
}

export function CreateTaskListModal({
  open,
  onClose,
  spaceId,
  folderId,
}: CreateTaskListModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    type: "DEV_ROADMAP" as TaskListType,
    description: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/crm/task-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          spaceId: folderId ? undefined : spaceId,
          folderId: folderId || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create task list");
      return res.json();
    },
    onSuccess: () => {
      onClose();
      setFormData({ name: "", type: "DEV_ROADMAP", description: "" });
      queryClient.invalidateQueries({ queryKey: ["crm-spaces"] });
      queryClient.invalidateQueries({ queryKey: ["crm-task-list"] });
    },
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Create Task List</DialogTitle>
          <DialogDescription>
            Create a new task list for organizing tasks
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="list-name" className="text-gray-700 font-medium">Name</Label>
            <Input
              id="list-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Dev Roadmap"
              className="bg-white border-gray-300 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="list-type" className="text-gray-700 font-medium">Type</Label>
            <select
              id="list-type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as TaskListType })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="DEV_ROADMAP">Dev Roadmap</option>
              <option value="BUG_TRACKING">Bug Tracking</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="list-description" className="text-gray-700 font-medium">Description (Optional)</Label>
            <Input
              id="list-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
              className="bg-white border-gray-300 text-gray-900"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-300 text-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name.trim() || createMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create List"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
