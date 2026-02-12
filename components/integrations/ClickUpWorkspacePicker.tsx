"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Check,
  X,
  ListTodo,
  FolderKanban,
  CheckCircle2,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";

interface Workspace {
  id: string;
  name: string;
  color: string;
  membersCount: number;
}

interface ImportSummary {
  spaces: number;
  folders: number;
  lists: number;
  statuses: number;
  tasks: number;
}

interface ClickUpWorkspacePickerProps {
  open: boolean;
  onClose: () => void;
}

export function ClickUpWorkspacePicker({
  open,
  onClose,
}: ClickUpWorkspacePickerProps) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    null
  );
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);

  // Fetch workspaces
  const {
    data: workspacesData,
    isLoading: workspacesLoading,
    error: workspacesError,
    refetch,
  } = useQuery({
    queryKey: ["clickup-workspaces"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/clickup/workspaces");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch workspaces");
      }
      return res.json();
    },
    enabled: open,
  });

  const workspaces: Workspace[] = workspacesData?.workspaces || [];

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (workspaceId: string) => {
      const res = await fetch("/api/integrations/clickup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Import failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setImportResult(data.summary);
    },
  });

  const handleImport = () => {
    if (!selectedWorkspace) return;
    importMutation.mutate(selectedWorkspace);
  };

  const handleClose = () => {
    setSelectedWorkspace(null);
    setImportResult(null);
    importMutation.reset();
    onClose();
  };

  // Success state
  if (importResult) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[520px] rounded-3xl border-gray-200/60 bg-white/80 backdrop-blur-xl shadow-xl p-0">
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Import Complete!
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Your ClickUp data has been imported into AYA AI CRM
            </p>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Spaces", value: importResult.spaces },
                { label: "Lists", value: importResult.lists },
                { label: "Tasks", value: importResult.tasks },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-gray-50/80 rounded-2xl border border-gray-200/60 p-3"
                >
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 text-xs text-gray-400 justify-center mb-6">
              <span>{importResult.folders} folders</span>
              <span>&middot;</span>
              <span>{importResult.statuses} status columns</span>
            </div>

            <Button
              onClick={handleClose}
              className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm hover:shadow-md transition-all duration-300 ease-out h-11"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-hidden flex flex-col rounded-3xl border-gray-200/60 bg-white/80 backdrop-blur-xl shadow-xl p-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200/60">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20 flex items-center justify-center">
                <ListTodo className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Import from ClickUp
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-0.5">
                  Select a workspace to import into your CRM
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Importing state */}
        {importMutation.isPending && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20 flex items-center justify-center mb-5">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
            </div>
            <p className="text-gray-900 font-semibold mb-1">
              Importing from ClickUp...
            </p>
            <p className="text-sm text-gray-500 text-center max-w-xs">
              Fetching spaces, lists, and tasks. This may take a moment
              depending on the size of your workspace.
            </p>
          </div>
        )}

        {/* Error state */}
        {importMutation.isError && (
          <div className="mx-6 mt-4 bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <X className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-sm font-medium text-red-700">
              {importMutation.error instanceof Error
                ? importMutation.error.message
                : "Import failed. Please try again."}
            </p>
          </div>
        )}

        {/* Workspace list */}
        {!importMutation.isPending && (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {workspacesLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20 flex items-center justify-center mb-4">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
                <p className="text-gray-600 font-medium">
                  Loading workspaces...
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Connecting to ClickUp
                </p>
              </div>
            ) : workspacesError ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 backdrop-blur-sm border border-red-500/20 flex items-center justify-center mb-4">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-red-600 font-medium mb-1">
                  Failed to load workspaces
                </p>
                <p className="text-sm text-gray-500 mb-4 text-center max-w-xs">
                  {workspacesError instanceof Error
                    ? workspacesError.message
                    : "An unexpected error occurred"}
                </p>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="rounded-2xl border-gray-200/60 bg-white/60 backdrop-blur-sm"
                >
                  Try Again
                </Button>
              </div>
            ) : workspaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-gray-500/10 backdrop-blur-sm border border-gray-200/60 flex items-center justify-center mb-4">
                  <FolderKanban className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium mb-1">
                  No workspaces found
                </p>
                <p className="text-sm text-gray-500 text-center max-w-xs">
                  Make sure your ClickUp account has at least one workspace.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {workspaces.map((workspace) => {
                  const isSelected = selectedWorkspace === workspace.id;
                  return (
                    <button
                      key={workspace.id}
                      onClick={() => setSelectedWorkspace(workspace.id)}
                      className={`
                        w-full text-left p-4 rounded-2xl border backdrop-blur-sm transition-all duration-200 ease-out
                        ${
                          isSelected
                            ? "bg-indigo-500/10 border-indigo-500/30"
                            : "bg-white/60 border-gray-200/60 hover:bg-white/80 hover:border-gray-300/60"
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Radio indicator */}
                          <div
                            className={`
                              w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ease-out
                              ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-600"
                                  : "border-gray-300 bg-white"
                              }
                            `}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>

                          {/* Workspace icon */}
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur-sm border border-indigo-500/20"
                            style={{
                              backgroundColor: workspace.color
                                ? `${workspace.color}15`
                                : "rgba(99,102,241,0.1)",
                            }}
                          >
                            <FolderKanban
                              className="w-4 h-4"
                              style={{
                                color: workspace.color || "#6366f1",
                              }}
                            />
                          </div>

                          {/* Workspace info */}
                          <div>
                            <p
                              className={`font-medium ${isSelected ? "text-indigo-700" : "text-gray-900"}`}
                            >
                              {workspace.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {workspace.membersCount} member
                              {workspace.membersCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!importMutation.isPending && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200/60 bg-gray-50/50">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="rounded-2xl border-gray-200/60 bg-white/60 backdrop-blur-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!selectedWorkspace || importMutation.isPending}
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm hover:shadow-md transition-all duration-300 ease-out min-w-[140px]"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Import Workspace
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
