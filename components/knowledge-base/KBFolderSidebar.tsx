"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface FolderNode {
  id: string;
  name: string;
  type: string;
  children?: FolderNode[];
  _count?: { documents: number; children: number };
  project?: { id: string; name: string } | null;
}

interface KBFolderSidebarProps {
  kbId: string;
  folders: FolderNode[];
  basePath: string;
  onCreateFolder?: (parentFolderId?: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onRenameFolder?: (folderId: string, currentName: string) => void;
}

function FolderTreeItem({
  folder,
  basePath,
  depth,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
}: {
  folder: FolderNode;
  basePath: string;
  depth: number;
  onCreateFolder?: (parentFolderId?: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onRenameFolder?: (folderId: string, currentName: string) => void;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(depth === 0);
  const isActive = pathname?.includes(`/folders/${folder.id}`);
  const hasChildren = folder.children && folder.children.length > 0;
  const docCount = folder._count?.documents || 0;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors",
          isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
          ) : (
            <span className="w-3" />
          )}
        </button>

        <Link
          href={`${basePath}/folders/${folder.id}`}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          {expanded ? (
            <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          <span className="truncate">{folder.name}</span>
          {docCount > 0 && (
            <span className="text-xs text-gray-400 flex-shrink-0">{docCount}</span>
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 flex-shrink-0">
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onCreateFolder?.(folder.id)}>
              <Plus className="w-3 h-3 mr-2" />
              New subfolder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRenameFolder?.(folder.id, folder.name)}>
              <Edit3 className="w-3 h-3 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteFolder?.(folder.id)}
              className="text-red-600"
            >
              <Trash2 className="w-3 h-3 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && hasChildren && (
        <div>
          {folder.children!.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              basePath={basePath}
              depth={depth + 1}
              onCreateFolder={onCreateFolder}
              onDeleteFolder={onDeleteFolder}
              onRenameFolder={onRenameFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function KBFolderSidebar({
  kbId,
  folders,
  basePath,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
}: KBFolderSidebarProps) {
  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50/50 p-3 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Folders</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onCreateFolder?.()}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {folders.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No folders yet</p>
      ) : (
        <div className="space-y-0.5">
          {folders.map((folder) => (
            <FolderTreeItem
              key={folder.id}
              folder={folder}
              basePath={basePath}
              depth={0}
              onCreateFolder={onCreateFolder}
              onDeleteFolder={onDeleteFolder}
              onRenameFolder={onRenameFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
