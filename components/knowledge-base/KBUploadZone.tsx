"use client";

import { useCallback, useState } from "react";
import { useUploadKBDocument } from "@/hooks/useKnowledgeBase";
import { Upload, File, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface KBUploadZoneProps {
  kbId: string;
  folderId: string;
  onUploadComplete?: () => void;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
  "text/plain", "text/markdown",
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm",
];

export function KBUploadZone({ kbId, folderId, onUploadComplete }: KBUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const uploadMutation = useUploadKBDocument(kbId);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ACCEPTED_TYPES.includes(f.type)
    );
    setPendingFiles((prev) => [...prev, ...files]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles((prev) => [...prev, ...files]);
  }, []);

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAll = async () => {
    for (const file of pendingFiles) {
      try {
        await uploadMutation.mutateAsync({ file, folderId, title: file.name });
        toast.success(`Uploaded: ${file.name}`);
      } catch {
        toast.error(`Failed to upload: ${file.name}`);
      }
    }
    setPendingFiles([]);
    onUploadComplete?.();
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        )}
        onClick={() => document.getElementById("kb-file-input")?.click()}
      >
        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">
          Drag & drop files here, or click to browse
        </p>
        <p className="text-xs text-gray-500 mt-1">
          PDF, Images, Markdown, Text, Audio (max 50MB)
        </p>
        <input
          id="kb-file-input"
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          {pendingFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <File className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm truncate flex-1">{file.name}</span>
              <span className="text-xs text-gray-400">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <Button onClick={uploadAll} disabled={uploadMutation.isPending} className="w-full">
            {uploadMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
            ) : (
              <>Upload {pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""}</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
