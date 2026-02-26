// hooks/useKnowledgeBase.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ---------- Knowledge Base ----------

export function useKnowledgeBases() {
  return useQuery({
    queryKey: ["knowledge-bases"],
    queryFn: async () => {
      const res = await fetch("/api/knowledge-base");
      if (!res.ok) throw new Error("Failed to fetch knowledge bases");
      const data = await res.json();
      return data.knowledgeBases;
    },
  });
}

export function useKnowledgeBase(kbId: string | null) {
  return useQuery({
    queryKey: ["knowledge-base", kbId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge-base/${kbId}`);
      if (!res.ok) throw new Error("Failed to fetch knowledge base");
      const data = await res.json();
      return data.knowledgeBase;
    },
    enabled: !!kbId,
  });
}

export function useCreateKnowledgeBase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create knowledge base");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
    },
  });
}

// ---------- Folders ----------

export function useKBFolders(kbId: string | null, parentFolderId?: string | null, projectId?: string) {
  return useQuery({
    queryKey: ["kb-folders", kbId, parentFolderId, projectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (parentFolderId) params.set("parentFolderId", parentFolderId);
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/knowledge-base/${kbId}/folders?${params}`);
      if (!res.ok) throw new Error("Failed to fetch folders");
      const data = await res.json();
      return data.folders;
    },
    enabled: !!kbId,
  });
}

export function useCreateKBFolder(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      parentFolderId?: string;
      projectId?: string;
      type?: string;
    }) => {
      const res = await fetch(`/api/knowledge-base/${kbId}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create folder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-folders", kbId] });
    },
  });
}

export function useDeleteKBFolder(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (folderId: string) => {
      const res = await fetch(`/api/knowledge-base/${kbId}/folders/${folderId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete folder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-folders", kbId] });
    },
  });
}

// ---------- Documents ----------

export function useKBDocuments(kbId: string | null, options?: {
  folderId?: string;
  fileType?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["kb-documents", kbId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.folderId) params.set("folderId", options.folderId);
      if (options?.fileType) params.set("fileType", options.fileType);
      if (options?.limit) params.set("limit", String(options.limit));
      if (options?.offset) params.set("offset", String(options.offset));
      const res = await fetch(`/api/knowledge-base/${kbId}/documents?${params}`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
    enabled: !!kbId,
  });
}

export function useKBDocument(kbId: string | null, docId: string | null) {
  return useQuery({
    queryKey: ["kb-document", kbId, docId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge-base/${kbId}/documents/${docId}`);
      if (!res.ok) throw new Error("Failed to fetch document");
      return res.json();
    },
    enabled: !!kbId && !!docId,
  });
}

export function useUploadKBDocument(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      file: File;
      folderId: string;
      title?: string;
      description?: string;
      tags?: string[];
    }) => {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("folderId", data.folderId);
      if (data.title) formData.append("title", data.title);
      if (data.description) formData.append("description", data.description);
      if (data.tags) formData.append("tags", JSON.stringify(data.tags));

      const res = await fetch(`/api/knowledge-base/${kbId}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-documents", kbId] });
    },
  });
}

export function useUpdateKBDocument(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, ...data }: {
      docId: string;
      title?: string;
      description?: string;
      tags?: string[];
      folderId?: string;
    }) => {
      const res = await fetch(`/api/knowledge-base/${kbId}/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update document");
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["kb-documents", kbId] });
      queryClient.invalidateQueries({ queryKey: ["kb-document", kbId, vars.docId] });
    },
  });
}

export function useDeleteKBDocument(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/knowledge-base/${kbId}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-documents", kbId] });
    },
  });
}

// ---------- Versions ----------

export function useUploadKBVersion(kbId: string, docId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { file: File; changeNote?: string }) => {
      const formData = new FormData();
      formData.append("file", data.file);
      if (data.changeNote) formData.append("changeNote", data.changeNote);

      const res = await fetch(`/api/knowledge-base/${kbId}/documents/${docId}/versions`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload new version");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-document", kbId, docId] });
      queryClient.invalidateQueries({ queryKey: ["kb-documents", kbId] });
    },
  });
}

// ---------- Favorites ----------

export function useToggleKBFavorite(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/knowledge-base/${kbId}/documents/${docId}/favorite`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to toggle favorite");
      return res.json();
    },
    onSuccess: (_, docId) => {
      queryClient.invalidateQueries({ queryKey: ["kb-document", kbId, docId] });
      queryClient.invalidateQueries({ queryKey: ["kb-favorites", kbId] });
    },
  });
}

export function useKBFavorites(kbId: string | null) {
  return useQuery({
    queryKey: ["kb-favorites", kbId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge-base/${kbId}/favorites`);
      if (!res.ok) throw new Error("Failed to fetch favorites");
      const data = await res.json();
      return data.documents;
    },
    enabled: !!kbId,
  });
}

// ---------- Search ----------

export function useKBSearch(kbId: string | null) {
  return useMutation({
    mutationFn: async (data: {
      query: string;
      mode?: "keyword" | "semantic" | "hybrid";
      folderId?: string;
      fileTypes?: string[];
      tags?: string[];
      limit?: number;
    }) => {
      const res = await fetch(`/api/knowledge-base/${kbId}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
  });
}

// ---------- Project Settings ----------

export function useKBProjectSettings(kbId: string | null, projectId: string | null) {
  return useQuery({
    queryKey: ["kb-project-settings", kbId, projectId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge-base/${kbId}/projects/${projectId}/settings`);
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      return data.settings;
    },
    enabled: !!kbId && !!projectId,
  });
}

export function useUpdateKBProjectSettings(kbId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      autoSaveTranscripts?: boolean;
      transcriptFolderId?: string;
    }) => {
      const res = await fetch(`/api/knowledge-base/${kbId}/projects/${projectId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-project-settings", kbId, projectId] });
    },
  });
}
