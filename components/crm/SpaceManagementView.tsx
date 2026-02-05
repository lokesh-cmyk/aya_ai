"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Edit2, Trash2, Share2, FolderKanban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPickerPopover } from "@/components/ui/color-picker-popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface SpaceManagementViewProps {
  onBack: () => void;
  onSelectSpace: (spaceId: string) => void;
}

export function SpaceManagementView({ onBack, onSelectSpace }: SpaceManagementViewProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingSpace, setEditingSpace] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", color: "#6366f1" });

  // Fetch spaces
  const { data: spacesData, isLoading } = useQuery({
    queryKey: ["crm-spaces"],
    queryFn: async () => {
      const res = await fetch("/api/crm/spaces");
      if (!res.ok) throw new Error("Failed to fetch spaces");
      return res.json();
    },
  });

  const spaces = spacesData?.spaces || [];

  // Create space mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/crm/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create space");
      return res.json();
    },
    onSuccess: (data) => {
      setIsCreating(false);
      setFormData({ name: "", description: "", color: "#6366f1" });
      queryClient.invalidateQueries({ queryKey: ["crm-spaces"] });
      onSelectSpace(data.space.id);
    },
  });

  // Update space mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await fetch(`/api/crm/spaces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update space");
      return res.json();
    },
    onSuccess: () => {
      setEditingSpace(null);
      setFormData({ name: "", description: "", color: "#6366f1" });
      queryClient.invalidateQueries({ queryKey: ["crm-spaces"] });
    },
  });

  // Delete space mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/crm/spaces/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete space");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-spaces"] });
    },
  });

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = (id: string) => {
    updateMutation.mutate({ id, data: formData });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this space? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const startEdit = (space: any) => {
    setEditingSpace(space.id);
    setFormData({
      name: space.name,
      description: space.description || "",
      color: space.color || "#6366f1",
    });
  };

  return (
    <div className="flex h-full bg-white text-gray-900">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">Spaces Management</h1>
          </div>
          <Button
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Space
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : spaces.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-700 mb-2">No spaces yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Create your first space to start organizing projects
              </p>
              <Button
                onClick={() => setIsCreating(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Space
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {spaces.map((space: any) => (
                <div
                  key={space.id}
                  className="glass-card rounded-xl p-5 cursor-pointer group"
                  onClick={() => onSelectSpace(space.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-lg shadow-sm ring-1 ring-black/10"
                        style={{ backgroundColor: space.color || "#6366f1" }}
                      />
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{space.name}</h3>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(space);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(space.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {space.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {space.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-gray-600">{space._count?.folders || 0}</span> folders
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-gray-600">{space._count?.taskLists || 0}</span> lists
                    </span>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement share functionality
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Space Dialog */}
      <Dialog open={isCreating || editingSpace !== null} onOpenChange={(open) => {
        if (!open) {
          setIsCreating(false);
          setEditingSpace(null);
          setFormData({ name: "", description: "", color: "#6366f1" });
        }
      }}>
        <DialogContent className="sm:max-w-[450px] glass-dark rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {editingSpace ? "Edit Space" : "Create New Space"}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {editingSpace
                ? "Update your space details"
                : "Create a new space to organize your projects"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="space-name" className="text-gray-700 font-medium text-sm">Name</Label>
              <Input
                id="space-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Project Space"
                className="bg-white/80 backdrop-blur-sm border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="space-description" className="text-gray-700 font-medium text-sm">Description</Label>
              <Input
                id="space-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                className="bg-white/80 backdrop-blur-sm border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium text-sm">Color</Label>
              <ColorPickerPopover
                value={formData.color}
                onChange={(color) => setFormData({ ...formData, color })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setEditingSpace(null);
                setFormData({ name: "", description: "", color: "#6366f1" });
              }}
              className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingSpace) {
                  handleUpdate(editingSpace);
                } else {
                  handleCreate();
                }
              }}
              disabled={
                !formData.name.trim() ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm shadow-blue-600/20"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {editingSpace ? "Updating..." : "Creating..."}
                </>
              ) : editingSpace ? (
                "Update Space"
              ) : (
                "Create Space"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
