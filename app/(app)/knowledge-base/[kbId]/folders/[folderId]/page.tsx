"use client";

import { useState, use } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useKBDocuments, useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { KBDocumentGrid } from "@/components/knowledge-base/KBDocumentGrid";
import { KBUploadZone } from "@/components/knowledge-base/KBUploadZone";
import { KBBreadcrumb } from "@/components/knowledge-base/KBBreadcrumb";

export default function FolderPage({
  params,
}: {
  params: Promise<{ kbId: string; folderId: string }>;
}) {
  const { kbId, folderId } = use(params);
  const { data: kb } = useKnowledgeBase(kbId);
  const { data: docsData, isLoading } = useKBDocuments(kbId, { folderId });
  const [showUpload, setShowUpload] = useState(false);

  const basePath = `/knowledge-base/${kbId}`;
  const folder = kb?.folders?.find((f: any) => f.id === folderId);

  return (
    <div className="p-6 space-y-4">
      {/* Breadcrumb */}
      <KBBreadcrumb
        items={[
          { label: kb?.name || "...", href: basePath },
          { label: folder?.name || "Folder" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Folder Documents
        </h2>
        <Button size="sm" onClick={() => setShowUpload(true)}>
          <Upload className="w-4 h-4 mr-1.5" />
          Upload
        </Button>
      </div>

      {/* Documents */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
          </DialogHeader>
          <div className="pt-4">
            <KBUploadZone
              kbId={kbId}
              folderId={folderId}
              onUploadComplete={() => setShowUpload(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
