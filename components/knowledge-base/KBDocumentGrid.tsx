"use client";

import Link from "next/link";
import { FileText, Image, FileAudio, File, Star, Clock, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToggleKBFavorite } from "@/hooks/useKnowledgeBase";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface KBDocumentGridProps {
  kbId: string;
  documents: any[];
  basePath: string;
}

const FILE_TYPE_ICONS: Record<string, any> = {
  PDF: FileText,
  IMAGE: Image,
  MARKDOWN: FileText,
  TEXT: FileText,
  AUDIO: FileAudio,
  TRANSCRIPT: FileText,
  OTHER: File,
};

const FILE_TYPE_COLORS: Record<string, string> = {
  PDF: "bg-red-50 text-red-600",
  IMAGE: "bg-purple-50 text-purple-600",
  MARKDOWN: "bg-blue-50 text-blue-600",
  TEXT: "bg-gray-50 text-gray-600",
  AUDIO: "bg-green-50 text-green-600",
  TRANSCRIPT: "bg-amber-50 text-amber-600",
  OTHER: "bg-gray-50 text-gray-600",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function KBDocumentGrid({ kbId, documents, basePath }: KBDocumentGridProps) {
  const toggleFavorite = useToggleKBFavorite(kbId);

  if (!documents?.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <File className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No documents in this folder yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc: any) => {
        const Icon = FILE_TYPE_ICONS[doc.fileType] || File;
        const colorClass = FILE_TYPE_COLORS[doc.fileType] || FILE_TYPE_COLORS.OTHER;

        return (
          <Card key={doc.id} className="group hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", colorClass)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`${basePath}/documents/${doc.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block"
                  >
                    {doc.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>·</span>
                    <span>{doc.fileType}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    toggleFavorite.mutate(doc.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Star className={cn("w-4 h-4", doc.isFavorited ? "fill-yellow-400 text-yellow-400" : "text-gray-400 hover:text-yellow-400")} />
                </button>
              </div>

              <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{doc.uploadedBy?.name || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</span>
                </div>
              </div>

              {doc.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {doc.tags.slice(0, 3).map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
