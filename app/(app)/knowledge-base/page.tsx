"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Library,
  Plus,
  FileText,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useKnowledgeBases,
  useCreateKnowledgeBase,
} from "@/hooks/useKnowledgeBase";
import { toast } from "sonner";

export default function KnowledgeBasePage() {
  const { data: knowledgeBases, isLoading } = useKnowledgeBases();
  const createKB = useCreateKnowledgeBase();
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKBName, setNewKBName] = useState("");
  const [newKBDescription, setNewKBDescription] = useState("");

  const handleCreateKB = async () => {
    if (!newKBName.trim()) return;
    try {
      const result = await createKB.mutateAsync({
        name: newKBName.trim(),
        description: newKBDescription.trim() || undefined,
      });
      toast.success("Knowledge base created");
      setShowCreateDialog(false);
      setNewKBName("");
      setNewKBDescription("");
      if (result?.knowledgeBase?.id) {
        router.push(`/knowledge-base/${result.knowledgeBase.id}`);
      }
    } catch {
      toast.error("Failed to create knowledge base");
    }
  };

  if (isLoading) {
    return <KBSkeleton />;
  }

  const totalDocs =
    knowledgeBases?.reduce(
      (sum: number, kb: any) => sum + (kb._count?.documents || 0),
      0
    ) || 0;
  const totalFolders =
    knowledgeBases?.reduce(
      (sum: number, kb: any) => sum + (kb._count?.folders || 0),
      0
    ) || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-gray-600 mt-1">
            Store, organize, and search your team's documents and files
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Knowledge Base
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Knowledge Base</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="kb-name">Name</Label>
                <Input
                  id="kb-name"
                  value={newKBName}
                  onChange={(e) => setNewKBName(e.target.value)}
                  placeholder="e.g., Product Documentation"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateKB()}
                />
              </div>
              <div>
                <Label htmlFor="kb-desc">Description (optional)</Label>
                <Textarea
                  id="kb-desc"
                  value={newKBDescription}
                  onChange={(e) => setNewKBDescription(e.target.value)}
                  placeholder="What will this knowledge base contain?"
                  rows={3}
                />
              </div>
              <Button
                onClick={handleCreateKB}
                disabled={!newKBName.trim() || createKB.isPending}
                className="w-full"
              >
                {createKB.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Knowledge Bases
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Library className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {knowledgeBases?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Documents
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalDocs}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Folders
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalFolders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Base List */}
      {!knowledgeBases?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <Library className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              No knowledge bases yet
            </h3>
            <p className="text-gray-500 text-center max-w-md mb-6">
              Create your first knowledge base to start storing and organizing
              your team's documents, meeting transcripts, and files.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Knowledge Base
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {knowledgeBases.map((kb: any) => (
            <Link key={kb.id} href={`/knowledge-base/${kb.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <Library className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{kb.name}</CardTitle>
                      {kb.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                          {kb.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{kb._count?.documents || 0} docs</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>{kb._count?.folders || 0} folders</span>
                    </div>
                  </div>
                  {kb.createdBy && (
                    <p className="text-xs text-gray-400 mt-2">
                      Created by {kb.createdBy.name}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function KBSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-72 mt-2" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
