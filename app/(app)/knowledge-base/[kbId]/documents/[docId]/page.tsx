"use client";

import { use } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Download,
  Star,
  Clock,
  User,
  FileText,
  Tag,
  History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useKBDocument, useToggleKBFavorite } from "@/hooks/useKnowledgeBase";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";

export default function DocumentPage({
  params,
}: {
  params: Promise<{ kbId: string; docId: string }>;
}) {
  const { kbId, docId } = use(params);
  const { data, isLoading } = useKBDocument(kbId, docId);
  const toggleFavorite = useToggleKBFavorite(kbId);

  const basePath = `/knowledge-base/${kbId}`;
  const doc = data?.document;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-500">Document not found</p>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 space-y-6">
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
        {doc.folder && (
          <>
            <Link
              href={`${basePath}/folders/${doc.folder.id}`}
              className="hover:text-blue-600"
            >
              {doc.folder.name}
            </Link>
            <ChevronRight className="w-3 h-3" />
          </>
        )}
        <span className="text-gray-900 font-medium truncate">{doc.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{doc.title}</h1>
          {doc.description && (
            <p className="text-gray-500 mt-1">{doc.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span>{doc.uploadedBy?.name || "Unknown"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {formatDistanceToNow(new Date(doc.updatedAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <span>{formatFileSize(doc.fileSize)}</span>
            <Badge variant="secondary">{doc.fileType}</Badge>
            {doc.source !== "UPLOAD" && (
              <Badge variant="outline">{doc.source.replace("_", " ")}</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleFavorite.mutate(docId)}
          >
            <Star
              className={
                doc.isFavorited
                  ? "w-4 h-4 fill-yellow-400 text-yellow-400"
                  : "w-4 h-4 text-gray-400"
              }
            />
          </Button>
          {doc.signedUrl && (
            <a href={doc.signedUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1.5" />
                Download
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Tags */}
      {doc.tags?.length > 0 && (
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-400" />
          {doc.tags.map((tag: string) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentPreview doc={doc} />
            </CardContent>
          </Card>
        </div>

        {/* Version History */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />
                Version History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500 mb-2">
                Current: v{doc.currentVersion}
              </div>
              {doc.versions?.length > 0 ? (
                <div className="space-y-3">
                  {doc.versions.map((v: any) => (
                    <div
                      key={v.id}
                      className="border-l-2 border-gray-200 pl-3 py-1"
                    >
                      <p className="text-sm font-medium">
                        Version {v.versionNumber}
                      </p>
                      {v.changeNote && (
                        <p className="text-xs text-gray-500">{v.changeNote}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {v.uploadedBy?.name} &middot;{" "}
                        {formatDistanceToNow(new Date(v.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No previous versions</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DocumentPreview({ doc }: { doc: any }) {
  if (doc.fileType === "IMAGE" && doc.signedUrl) {
    return (
      <div className="flex justify-center">
        <img
          src={doc.signedUrl}
          alt={doc.title}
          className="max-w-full max-h-[600px] rounded-lg"
        />
      </div>
    );
  }

  if (doc.fileType === "PDF" && doc.signedUrl) {
    return (
      <iframe
        src={doc.signedUrl}
        className="w-full h-[600px] rounded-lg border"
        title={doc.title}
      />
    );
  }

  if (doc.fileType === "MARKDOWN" && doc.content) {
    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown>{doc.content}</ReactMarkdown>
      </div>
    );
  }

  if (
    (doc.fileType === "TEXT" || doc.fileType === "TRANSCRIPT") &&
    doc.content
  ) {
    return (
      <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg max-h-[600px] overflow-y-auto font-mono">
        {doc.content}
      </pre>
    );
  }

  if (doc.fileType === "AUDIO" && doc.signedUrl) {
    return (
      <div className="flex justify-center py-8">
        <audio controls src={doc.signedUrl} className="w-full max-w-md" />
      </div>
    );
  }

  return (
    <div className="text-center py-12 text-gray-500">
      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <p className="text-sm">Preview not available for this file type</p>
      {doc.signedUrl && (
        <a href={doc.signedUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="mt-3">
            <Download className="w-4 h-4 mr-1.5" />
            Download to view
          </Button>
        </a>
      )}
    </div>
  );
}
