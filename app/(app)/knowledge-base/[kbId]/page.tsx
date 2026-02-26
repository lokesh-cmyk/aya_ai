"use client";

import { useState, use } from "react";
import { Plus, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useKnowledgeBase,
  useKBDocuments,
  useCreateKBFolder,
} from "@/hooks/useKnowledgeBase";
import { KBFolderSidebar } from "@/components/knowledge-base/KBFolderSidebar";
import { KBDocumentGrid } from "@/components/knowledge-base/KBDocumentGrid";
import { KBSearchBar } from "@/components/knowledge-base/KBSearchBar";
import { KBUploadZone } from "@/components/knowledge-base/KBUploadZone";
import { toast } from "sonner";

export default function KBDetailPage({
  params,
}: {
  params: Promise<{ kbId: string }>;
}) {
  const { kbId } = use(params);
  const { data: kb, isLoading: kbLoading } = useKnowledgeBase(kbId);
  const { data: docsData, isLoading: docsLoading } = useKBDocuments(kbId);
  const createFolder = useCreateKBFolder(kbId);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<
    string | undefined
  >();

  const basePath = `/knowledge-base/${kbId}`;

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder.mutateAsync({
        name: newFolderName.trim(),
        parentFolderId: newFolderParentId,
      });
      toast.success("Folder created");
      setShowNewFolder(false);
      setNewFolderName("");
      setNewFolderParentId(undefined);
    } catch {
      toast.error("Failed to create folder");
    }
  };

  const handleFolderCreate = (parentFolderId?: string) => {
    setNewFolderParentId(parentFolderId);
    setShowNewFolder(true);
  };

  const handleFolderDelete = (folderId: string) => {
    // This would use the delete mutation — kept simple for now
    toast.info("Delete folder: " + folderId);
  };

  const handleFolderRename = (folderId: string, currentName: string) => {
    toast.info("Rename folder: " + currentName);
  };

  if (kbLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="flex gap-6">
          <Skeleton className="w-64 h-96" />
          <div className="flex-1">
            <Skeleton className="h-10 w-full mb-4" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!kb) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-500">Knowledge base not found</p>
      </div>
    );
  }

  // Get the first folder ID for upload (or undefined if no folders exist)
  const firstFolderId = kb.folders?.[0]?.id;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{kb.name}</h1>
          {kb.description && (
            <p className="text-sm text-gray-500 mt-0.5">{kb.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewFolder(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Folder
          </Button>
          {firstFolderId && (
            <Button size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="w-4 h-4 mr-1.5" />
              Upload
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <KBSearchBar kbId={kbId} basePath={basePath} />
      </div>

      {/* Main content with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <KBFolderSidebar
          kbId={kbId}
          folders={kb.folders || []}
          basePath={basePath}
          onCreateFolder={handleFolderCreate}
          onDeleteFolder={handleFolderDelete}
          onRenameFolder={handleFolderRename}
        />

        <div className="flex-1 p-4 overflow-y-auto">
          {docsLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <KBDocumentGrid
              kbId={kbId}
              documents={docsData?.documents || []}
              basePath={basePath}
            />
          )}
        </div>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g., Project Documents"
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              />
            </div>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolder.isPending}
              className="w-full"
            >
              {createFolder.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Folder"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
          </DialogHeader>
          <div className="pt-4">
            {firstFolderId && (
              <KBUploadZone
                kbId={kbId}
                folderId={firstFolderId}
                onUploadComplete={() => setShowUpload(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
