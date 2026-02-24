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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Pencil, Trash2 } from "lucide-react";

interface PlaybookDetailDialogProps {
  playbook: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  SLA_BREACH: "bg-red-100 text-red-700 border-red-200",
  CONTRACT: "bg-blue-100 text-blue-700 border-blue-200",
  DELIVERY: "bg-amber-100 text-amber-700 border-amber-200",
  FINANCIAL: "bg-green-100 text-green-700 border-green-200",
  OPERATIONAL: "bg-purple-100 text-purple-700 border-purple-200",
  SECURITY: "bg-gray-100 text-gray-700 border-gray-200",
};

function formatCategoryLabel(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PlaybookDetailDialog({
  playbook,
  open,
  onOpenChange,
}: PlaybookDetailDialogProps) {
  const queryClient = useQueryClient();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/playbooks/${playbook.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete playbook");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
      setConfirmDeleteOpen(false);
      onOpenChange(false);
    },
  });

  if (!playbook) return null;

  const categoryClasses =
    CATEGORY_BADGE_CLASSES[playbook.category] || CATEGORY_BADGE_CLASSES.SECURITY;

  const steps = Array.isArray(playbook.steps)
    ? [...playbook.steps].sort(
        (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
      )
    : [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{playbook.name}</DialogTitle>
            <DialogDescription>
              <span className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={categoryClasses}>
                  {formatCategoryLabel(playbook.category)}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    playbook.isSystemProvided
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-teal-50 text-teal-700 border-teal-200"
                  }
                >
                  {playbook.isSystemProvided ? "System" : "Custom"}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    playbook.isActive
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                  }
                >
                  {playbook.isActive ? "Active" : "Inactive"}
                </Badge>
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Description */}
            {playbook.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Description
                </h4>
                <p className="text-sm text-gray-600">{playbook.description}</p>
              </div>
            )}

            {/* Trigger condition */}
            {playbook.triggerCondition && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <Zap className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-amber-800">
                    Trigger Condition
                  </h4>
                  <p className="text-sm text-amber-700 mt-0.5">
                    {playbook.triggerCondition}
                  </p>
                </div>
              </div>
            )}

            {/* Steps */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Steps ({steps.length})
              </h4>
              {steps.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No steps defined for this playbook.
                </p>
              ) : (
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
              )}
            </div>
          </div>

          {/* Footer actions for custom playbooks */}
          {!playbook.isSystemProvided && (
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playbook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{playbook.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
          {deleteMutation.isError && (
            <p className="text-sm text-red-600 text-center mt-2">
              {deleteMutation.error?.message || "Failed to delete playbook"}
            </p>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
