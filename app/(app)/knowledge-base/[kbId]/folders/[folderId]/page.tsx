"use client";

import { useState, use } from "react";
import Link from "next/link";
import { Upload, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useKBDocuments } from "@/hooks/useKnowledgeBase";
import { KBDocumentGrid } from "@/components/knowledge-base/KBDocumentGrid";
import { KBUploadZone } from "@/components/knowledge-base/KBUploadZone";

export default function FolderPage({
  params,
}: {
  params: Promise<{ kbId: string; folderId: string }>;
}) {
  const { kbId, folderId } = use(params);
  const { data: docsData, isLoading } = useKBDocuments(kbId, { folderId });
  const [showUpload, setShowUpload] = useState(false);

  const basePath = `/knowledge-base/${kbId}`;

  return (
    <div className="p-6 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-gray-500">
        <Link href="/knowledge-base" className="hover:text-blue-600">
          Knowledge Base
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={basePath} className="hover:text-blue-600">
          KB
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-900 font-medium">Folder</span>
      </div>

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
