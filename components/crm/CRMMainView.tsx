"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderKanban,
  Plus,
  Folder,
  List,
  Search,
  Filter,
  MoreVertical,
  Settings,
  Share2,
  Loader2,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Trash2,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/auth-client";
import { TaskListView } from "./TaskListView";
import { TaskDetailView } from "./TaskDetailView";
import { SpaceManagementView } from "./SpaceManagementView";
import { CreateTaskListModal } from "./CreateTaskListModal";
import { CreateFolderModal } from "./CreateFolderModal";

export function CRMMainView() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [selectedTaskList, setSelectedTaskList] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showSpacesMgmt, setShowSpacesMgmt] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateList, setShowCreateList] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [createListFolderId, setCreateListFolderId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "folder" | "taskList";
    id: string;
    name: string;
  } | null>(null);

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
  const currentSpace = spaces.find((s: any) => s.id === selectedSpace) || spaces[0];

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const res = await fetch(`/api/crm/folders/${folderId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete folder");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-spaces"] });
      setDeleteConfirm(null);
    },
  });

  // Delete task list mutation
  const deleteTaskListMutation = useMutation({
    mutationFn: async (taskListId: string) => {
      const res = await fetch(`/api/crm/task-lists/${taskListId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete task list");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-spaces"] });
      if (selectedTaskList === deleteConfirm?.id) {
        setSelectedTaskList(null);
      }
      setDeleteConfirm(null);
    },
  });

  const handleDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "folder") {
      deleteFolderMutation.mutate(deleteConfirm.id);
    } else {
      deleteTaskListMutation.mutate(deleteConfirm.id);
    }
  };
  
  // Auto-select first space
  useEffect(() => {
    if (spaces.length > 0 && !selectedSpace) {
      setSelectedSpace(spaces[0].id);
    }
  }, [spaces.length, selectedSpace]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowFilterMenu(false);
        setShowShareMenu(false);
        setShowMoreMenu(false);
      }
    };

    if (showFilterMenu || showShareMenu || showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFilterMenu, showShareMenu, showMoreMenu]);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  if (showSpacesMgmt) {
    return (
      <SpaceManagementView
        onBack={() => setShowSpacesMgmt(false)}
        onSelectSpace={(spaceId) => {
          setSelectedSpace(spaceId);
          setShowSpacesMgmt(false);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">
      {/* Collapsible Left Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-gray-50/50 border-r border-gray-200 flex flex-col transition-all duration-200 flex-shrink-0`}>
        {/* Header */}
        <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white/80 backdrop-blur-sm">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 flex-1">
              <h2 className="text-sm font-semibold text-gray-900">Spaces</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto"
                onClick={() => setShowSpacesMgmt(true)}
              >
                <Settings className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            )}
          </Button>
        </div>

        {!sidebarCollapsed && (
          <>
            <div className="p-3">
              <Button
                size="sm"
                className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm hover:shadow transition-all"
                onClick={() => setShowSpacesMgmt(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Space
              </Button>
            </div>

            {/* Spaces List */}
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : spaces.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm px-2">
                  <p>No spaces yet</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 text-blue-600 hover:text-blue-700"
                    onClick={() => setShowSpacesMgmt(true)}
                  >
                    Create your first space
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {spaces.map((space: any) => (
                    <div key={space.id}>
                      <button
                        onClick={() => setSelectedSpace(space.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-all ${
                          selectedSpace === space.id
                            ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                            : "text-gray-700 hover:bg-white hover:shadow-sm"
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded flex-shrink-0"
                          style={{ backgroundColor: space.color || "#6366f1" }}
                        />
                        <span className="flex-1 truncate text-sm font-medium">{space.name}</span>
                      </button>

                      {/* Show folders and task lists for selected space */}
                      {selectedSpace === space.id && currentSpace && (
                        <div className="ml-4 mt-1 space-y-1">
                          {/* Folders */}
                          {currentSpace.folders?.map((folder: any) => (
                            <div key={folder.id} className="group/folder">
                              <div className="flex items-center">
                                <button
                                  onClick={() => toggleFolder(folder.id)}
                                  className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-left text-gray-600 hover:bg-white hover:text-gray-900 text-sm transition-colors"
                                >
                                  {expandedFolders.has(folder.id) ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                  <Folder className="w-3 h-3" />
                                  <span className="flex-1 truncate">{folder.name}</span>
                                  <span className="text-xs text-gray-400">
                                    {folder.taskLists?.length || 0}
                                  </span>
                                </button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 opacity-0 group-hover/folder:opacity-100 transition-opacity"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm({
                                          type: "folder",
                                          id: folder.id,
                                          name: folder.name,
                                        });
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Folder
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              {expandedFolders.has(folder.id) && folder.taskLists && (
                                <div className="ml-4 space-y-0.5">
                                  {folder.taskLists.map((list: any) => (
                                    <div key={list.id} className="group/list flex items-center">
                                      <button
                                        onClick={() => setSelectedTaskList(list.id)}
                                        className={`flex-1 flex items-center gap-2 px-2 py-1 rounded text-left text-xs transition-colors ${
                                          selectedTaskList === list.id
                                            ? "text-blue-600 font-medium bg-blue-50"
                                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                        }`}
                                      >
                                        <List className="w-3 h-3" />
                                        <span className="flex-1 truncate">{list.name}</span>
                                      </button>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 opacity-0 group-hover/list:opacity-100 transition-opacity"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <MoreVertical className="w-3 h-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                          <DropdownMenuItem
                                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeleteConfirm({
                                                type: "taskList",
                                                id: list.id,
                                                name: list.name,
                                              });
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete List
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => {
                                      setCreateListFolderId(folder.id);
                                      setShowCreateList(true);
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-1 rounded text-left text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Add List</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Task Lists (not in folders) */}
                          {currentSpace.taskLists?.map((list: any) => (
                            <div key={list.id} className="group/rootlist flex items-center">
                              <button
                                onClick={() => setSelectedTaskList(list.id)}
                                className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
                                  selectedTaskList === list.id
                                    ? "text-blue-600 font-medium bg-blue-50"
                                    : "text-gray-600 hover:bg-white hover:text-gray-900"
                                }`}
                              >
                                <List className="w-3 h-3" />
                                <span className="flex-1 truncate">{list.name}</span>
                                <span className="text-xs text-gray-400">
                                  {list._count?.tasks || 0}
                                </span>
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover/rootlist:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirm({
                                        type: "taskList",
                                        id: list.id,
                                        name: list.name,
                                      });
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete List
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ))}

                          {/* Add Folder Button */}
                          <button
                            onClick={() => setShowCreateFolder(true)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm text-gray-500 hover:text-gray-700 hover:bg-white mt-2 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>New Folder</span>
                          </button>

                          {/* Add Task List Button */}
                          <button
                            onClick={() => {
                              setCreateListFolderId(null);
                              setShowCreateList(true);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm text-gray-500 hover:text-gray-700 hover:bg-white transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>New List</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {sidebarCollapsed && (
          <div className="flex flex-col items-center py-2 space-y-2">
            {spaces.map((space: any) => (
              <button
                key={space.id}
                onClick={() => setSelectedSpace(space.id)}
                className={`w-10 h-10 rounded-md flex items-center justify-center transition-all ${
                  selectedSpace === space.id
                    ? "bg-blue-100"
                    : "hover:bg-white"
                }`}
                title={space.name}
              >
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: space.color || "#6366f1" }}
                />
              </button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setShowSpacesMgmt(true)}
              title="Settings"
            >
              <Settings className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Top Header */}
        <div className="h-14 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 relative z-20">
          <div className="flex items-center gap-4">
            {currentSpace && (
              <>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: currentSpace.color || "#6366f1" }}
                  />
                  <h1 className="text-base font-semibold text-gray-900">{currentSpace.name}</h1>
                </div>
                {selectedTaskList && (
                  <>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-600 text-sm">
                      {currentSpace.folders
                        ?.flatMap((f: any) => f.taskLists || [])
                        .concat(currentSpace.taskLists || [])
                        .find((l: any) => l.id === selectedTaskList)?.name || "Task List"}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 pl-9 h-9 bg-white/80 border-gray-200 rounded-lg text-sm focus:w-64 transition-all"
              />
            </div>

            {/* Filter Button */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className={`text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg ${filterPriority ? 'bg-blue-50 text-blue-600' : ''}`}
                onClick={() => {
                  setShowFilterMenu(!showFilterMenu);
                  setShowShareMenu(false);
                  setShowMoreMenu(false);
                }}
              >
                <Filter className="w-4 h-4" />
              </Button>
              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-2 min-w-[180px] z-[100] animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter by Priority</div>
                  <button
                    onClick={() => { setFilterPriority(null); setShowFilterMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${!filterPriority ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    All Priorities
                  </button>
                  <button
                    onClick={() => { setFilterPriority("URGENT"); setShowFilterMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${filterPriority === 'URGENT' ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Urgent
                  </button>
                  <button
                    onClick={() => { setFilterPriority("HIGH"); setShowFilterMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${filterPriority === 'HIGH' ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    High
                  </button>
                  <button
                    onClick={() => { setFilterPriority("NORMAL"); setShowFilterMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${filterPriority === 'NORMAL' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Normal
                  </button>
                  <button
                    onClick={() => { setFilterPriority("LOW"); setShowFilterMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${filterPriority === 'LOW' ? 'bg-gray-100 text-gray-600' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    Low
                  </button>
                </div>
              )}
            </div>

            {/* Share Button */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                onClick={() => {
                  setShowShareMenu(!showShareMenu);
                  setShowFilterMenu(false);
                  setShowMoreMenu(false);
                }}
              >
                <Share2 className="w-4 h-4" />
              </Button>
              {showShareMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-2 min-w-[200px] z-[100] animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Share Options</div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setShowShareMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Copy link to clipboard
                  </button>
                  <button
                    onClick={() => {
                      if (currentSpace) {
                        navigator.clipboard.writeText(`${window.location.origin}/crm?space=${currentSpace.id}`);
                      }
                      setShowShareMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Copy space link
                  </button>
                </div>
              )}
            </div>

            {/* More Options Button */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                onClick={() => {
                  setShowMoreMenu(!showMoreMenu);
                  setShowFilterMenu(false);
                  setShowShareMenu(false);
                }}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-2 min-w-[180px] z-[100] animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => {
                      setShowSpacesMgmt(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Space Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateList(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New Task List
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateFolder(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Folder className="w-4 h-4" />
                    New Folder
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ["crm-spaces"] });
                      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Refresh Data
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Task List View - Fixed scroll container */}
        <div className="flex-1 overflow-hidden bg-white relative z-0">
          {selectedTaskList ? (
            <TaskListView
              taskListId={selectedTaskList}
              onTaskSelect={setSelectedTask}
              searchQuery={searchQuery}
              filterPriority={filterPriority}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <FolderKanban className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2 text-gray-700">Select a task list</p>
                <p className="text-sm text-gray-500">Choose a task list from the sidebar to view tasks</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Modal Overlay */}
      {selectedTask && (
        <TaskDetailView
          taskId={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
          }}
        />
      )}

      {/* Create Task List Modal */}
      {currentSpace && (
        <CreateTaskListModal
          open={showCreateList}
          onClose={() => {
            setShowCreateList(false);
            setCreateListFolderId(null);
          }}
          spaceId={currentSpace.id}
          folderId={createListFolderId || undefined}
        />
      )}

      {/* Create Folder Modal */}
      {currentSpace && (
        <CreateFolderModal
          open={showCreateFolder}
          onClose={() => setShowCreateFolder(false)}
          spaceId={currentSpace.id}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Delete {deleteConfirm?.type === "folder" ? "Folder" : "Task List"}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Are you sure you want to delete <span className="font-semibold text-gray-900">&quot;{deleteConfirm?.name}&quot;</span>?
              {deleteConfirm?.type === "folder" ? (
                <span className="block mt-2 text-red-600">
                  This will also delete all task lists and tasks inside this folder.
                </span>
              ) : (
                <span className="block mt-2 text-red-600">
                  This will also delete all tasks in this list.
                </span>
              )}
              <span className="block mt-2 font-medium">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={deleteFolderMutation.isPending || deleteTaskListMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteFolderMutation.isPending || deleteTaskListMutation.isPending}
            >
              {(deleteFolderMutation.isPending || deleteTaskListMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
