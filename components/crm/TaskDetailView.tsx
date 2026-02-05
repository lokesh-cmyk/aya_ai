"use client";

import { useState, useEffect } from "react";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Save,
  Flag,
  Calendar,
  User,
  Star,
  MessageSquare,
  Loader2,
  ChevronDown,
  ChevronUp,
  Search,
  Bell,
  MoreVertical,
  Share2,
  Send,
  Plus,
  Image,
  Link as LinkIcon,
  AtSign,
  Smile,
  Clock,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Maximize2,
  Reply,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/ui/star-rating";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { PrioritySelector, PriorityBadge } from "@/components/ui/priority-selector";
import { TaskPriority } from "@/app/generated/prisma/enums";
import { useSession } from "@/lib/auth-client";

interface TaskDetailViewProps {
  taskId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function TaskDetailView({ taskId, onClose, onUpdate }: TaskDetailViewProps) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showCustomFields, setShowCustomFields] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showActivitySearch, setShowActivitySearch] = useState(false);
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showMentionDialog, setShowMentionDialog] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [showActivityOptionsMenu, setShowActivityOptionsMenu] = useState(false);
  const [activityFilter, setActivityFilter] = useState<"all" | "comments">("all");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showShareMenu || showMoreMenu || showActivitySearch || showEmojiPicker || showActivityOptionsMenu) {
        if (!target.closest('.menu-container') && !target.closest('.emoji-picker-container')) {
          setShowShareMenu(false);
          setShowMoreMenu(false);
          setShowActivitySearch(false);
          setShowEmojiPicker(false);
          setShowActivityOptionsMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showShareMenu, showMoreMenu, showActivitySearch, showEmojiPicker, showActivityOptionsMenu]);

  // Fetch task details
  const { data: taskData, isLoading, refetch: refetchTask } = useQuery({
    queryKey: ["crm-task", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/crm/tasks/${taskId}`);
      if (!res.ok) throw new Error("Failed to fetch task");
      return res.json();
    },
  });

  const task = taskData?.task;
  const statuses = task?.taskList?.statuses || [];
  const taskListName = task?.taskList?.name || "Task List";
  const spaceName = task?.taskList?.space?.name || "Space";

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    statusId: "",
    assigneeId: "",
    priority: "NORMAL" as TaskPriority,
    progress: 0,
    complexity: 3,
    dueDate: undefined as Date | undefined,
  });

  // Fetch team users for assignment
  const { data: usersData } = useQuery({
    queryKey: ["team-users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) return { users: [] };
      return res.json();
    },
  });

  const teamUsers = usersData?.users || [];

  // Update form when task loads
  useEffect(() => {
    if (task && !isEditing) {
      setFormData({
        name: task.name || "",
        description: task.description || "",
        statusId: task.statusId || "",
        assigneeId: task.assigneeId || "",
        priority: task.priority || "NORMAL",
        progress: task.progress || 0,
        complexity: task.complexity || 3,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      });
    }
  }, [task, isEditing]);

  // Update task mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/crm/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      setIsEditing(false);
      setEditingField(null);
      // Invalidate the specific task
      queryClient.invalidateQueries({ queryKey: ["crm-task", taskId] });
      // Invalidate the specific task list this task belongs to
      if (task?.taskList?.id) {
        queryClient.invalidateQueries({ queryKey: ["crm-tasks", task.taskList.id] });
      }
      // Invalidate all task lists as a fallback
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
      // Invalidate command center signals since task status may have changed
      queryClient.invalidateQueries({ queryKey: ["command-center"] });
      onUpdate();
    },
  });

  // Add comment mutation with optimistic updates
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/crm/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      return res.json();
    },
    onMutate: async (content: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["crm-task", taskId] });
      
      // Snapshot previous value
      const previousTask = queryClient.getQueryData(["crm-task", taskId]);
      
      // Optimistically update
      if (previousTask && session?.user) {
        const optimisticComment = {
          id: `temp-${Date.now()}`,
          content,
          createdAt: new Date().toISOString(),
          author: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
          },
          replies: [],
        };
        
        queryClient.setQueryData(["crm-task", taskId], (old: any) => ({
          ...old,
          task: {
            ...old.task,
            comments: [...(old.task?.comments || []), optimisticComment],
          },
        }));
      }
      
      return { previousTask };
    },
    onError: (err, content, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(["crm-task", taskId], context.previousTask);
      }
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["crm-task", taskId] });
    },
  });

  // Watch/unwatch task mutation
  const watchMutation = useMutation({
    mutationFn: async (watch: boolean) => {
      const res = await fetch(`/api/crm/tasks/${taskId}/watch`, {
        method: watch ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error("Failed to update watch status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-task", taskId] });
    },
  });

  // Reaction mutation
  const reactionMutation = useMutation({
    mutationFn: async ({ commentId, type }: { commentId: string; type: "like" | "dislike" }) => {
      const res = await fetch(`/api/crm/tasks/${taskId}/comments/${commentId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error("Failed to update reaction");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-task", taskId] });
    },
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({ parentId, content }: { parentId: string; content: string }) => {
      const res = await fetch(`/api/crm/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId }),
      });
      if (!res.ok) throw new Error("Failed to add reply");
      return res.json();
    },
    onSuccess: async () => {
      setReplyingTo(null);
      setReplyText("");
      // Force refetch to ensure replies are shown
      await queryClient.invalidateQueries({ queryKey: ["crm-task", taskId] });
      await refetchTask();
    },
  });

  const handleToggleWatch = () => {
    watchMutation.mutate(!task?.isWatching);
  };

  const handleReaction = (commentId: string, type: "like" | "dislike") => {
    reactionMutation.mutate({ commentId, type });
  };

  const handleReply = (parentId: string) => {
    if (!replyText.trim()) return;
    replyMutation.mutate({ parentId, content: replyText });
  };

  const handleSave = () => {
    updateMutation.mutate({
      ...formData,
      dueDate: formData.dueDate ? formData.dueDate.toISOString() : null,
    });
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    commentMutation.mutate(commentText);
  };

  const handleFieldUpdate = (field: string, value: any) => {
    // Update local state
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Immediately save to server
    updateMutation.mutate({ [field]: value });
  };

  // Handle status change with immediate save
  const handleStatusChange = (statusId: string) => {
    setFormData((prev) => ({ ...prev, statusId }));
    updateMutation.mutate({ statusId: statusId || null });
  };

  // Handle assignee change with immediate save
  const handleAssigneeChange = (assigneeId: string) => {
    setFormData((prev) => ({ ...prev, assigneeId }));
    updateMutation.mutate({ assigneeId: assigneeId || null });
  };

  // Handle priority change with immediate save
  const handlePriorityChange = (priority: TaskPriority) => {
    setFormData((prev) => ({ ...prev, priority }));
    updateMutation.mutate({ priority });
  };

  // Handle due date change with immediate save
  const handleDueDateChange = (date: Date | undefined) => {
    setFormData((prev) => ({ ...prev, dueDate: date }));
    updateMutation.mutate({ dueDate: date ? date.toISOString() : null });
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setShowShareMenu(false);
      // You could add a toast notification here
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleCopyTaskLink = async () => {
    try {
      const url = `${window.location.origin}/crm?task=${taskId}`;
      await navigator.clipboard.writeText(url);
      setShowShareMenu(false);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/crm/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onClose();
        onUpdate();
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleCopyComment = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error("Failed to copy comment:", err);
    }
  };

  const handleAddImage = () => {
    // Create file input for image upload
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Handle image upload - you can implement this later
        console.log("Image selected:", file);
      }
    };
    input.click();
  };

  const handleAddLink = () => {
    setShowLinkDialog(true);
  };

  const handleConfirmLink = () => {
    if (linkUrl) {
      const text = linkText || linkUrl;
      setCommentText((prev) => `${prev} [${text}](${linkUrl})`);
      setLinkUrl("");
      setLinkText("");
      setShowLinkDialog(false);
    }
  };

  const handleMention = () => {
    setShowMentionDialog(true);
  };

  const handleConfirmMention = (username: string) => {
    if (username) {
      setCommentText((prev) => `${prev} @${username} `);
      setMentionQuery("");
      setShowMentionDialog(false);
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setCommentText((prev) => `${prev}${emoji}`);
    setShowEmojiPicker(false);
  };

  // Fetch team members for mention
  const { data: membersData } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) return { users: [] };
      return res.json();
    },
  });

  const teamMembers = membersData?.users || [];
  const filteredMembers = mentionQuery
    ? teamMembers.filter((m: any) =>
        (m.name || m.email || "").toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : teamMembers;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-50 text-red-700 border-red-200";
      case "HIGH":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "NORMAL":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "LOW":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusColor = (statusName: string) => {
    const lower = statusName.toLowerCase();
    if (lower.includes("progress")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (lower.includes("done") || lower.includes("complete")) return "bg-green-50 text-green-700 border-green-200";
    if (lower.includes("todo") || lower.includes("backlog")) return "bg-gray-50 text-gray-700 border-gray-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${days[d.getDay()]} ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  const formatRelativeTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  };

  // Filter comments based on search
  const filteredComments = task?.comments?.filter((comment: any) => {
    if (!activitySearchQuery) return true;
    const query = activitySearchQuery.toLowerCase();
    return (
      comment.content.toLowerCase().includes(query) ||
      comment.author.name?.toLowerCase().includes(query) ||
      comment.author.email?.toLowerCase().includes(query)
    );
  }) || [];

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
          <p className="text-gray-500">Task not found</p>
        </div>
      </div>
    );
  }

  const currentStatus = statuses.find((s: any) => s.id === task.statusId);
  const createdDate = new Date(task.createdAt);
  const isCreator = task.creator?.id === session?.user?.id;

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className={`bg-white/95 backdrop-blur-xl rounded-3xl w-full ${isMaximized ? 'max-w-full h-full' : 'max-w-7xl h-[90vh]'} flex flex-col shadow-2xl border border-white/20 transition-all duration-300 ease-out`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar - Glassmorphism */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl rounded-t-3xl">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 font-medium">
              {spaceName} / {taskListName}
            </div>
            <div className="text-xs text-gray-400">Created {formatDate(createdDate)}</div>
          </div>
          <div className="flex items-center gap-2">
            {/* Share Button with Menu */}
            <div className="relative menu-container">
              {/* <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all duration-200"
                onClick={() => setShowShareMenu(!showShareMenu)}
              >
                <Share2 className="w-4 h-4" />
              </Button> */}
              {showShareMenu && (
                <div className="absolute right-0 top-12 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-2 min-w-[180px] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={handleShare}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all duration-150"
                  >
                    Copy page link
                  </button>
                  <button
                    onClick={handleCopyTaskLink}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all duration-150"
                  >
                    Copy task link
                  </button>
                </div>
              )}
            </div>

            {/* More Options Menu */}
            <div className="relative menu-container">
              {/* <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all duration-200"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
              >
                <MoreVertical className="w-4 h-4" />
              </Button> */}
              {showMoreMenu && (
                <div className="absolute right-0 top-12 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-2 min-w-[180px] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all duration-150 flex items-center gap-2"
                  >
                    <Maximize2 className="w-4 h-4" />
                    {isMaximized ? "Restore" : "Maximize"}
                  </button>
                  <button
                    onClick={handleDeleteTask}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/80 rounded-xl transition-all duration-150"
                  >
                    Delete task
                  </button>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Main Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {/* Task Title Section */}
            <div className="mb-6">
              {isEditing ? (
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-3xl font-bold border-0 border-b-2 border-gray-300 focus:border-blue-500 rounded-none px-0 py-2 mb-4 transition-all duration-200"
                  placeholder="Task name"
                />
              ) : (
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{task.name}</h1>
              )}
              <div className="text-sm text-gray-600 bg-gradient-to-r from-blue-50/80 to-purple-50/80 backdrop-blur-sm border border-blue-200/50 rounded-2xl px-4 py-3 mb-6 shadow-sm transition-all duration-200 hover:shadow-md">
                💡 Ask Brain to create a summary, generate subtasks or find similar tasks
              </div>
            </div>

            {/* Task Properties Row */}
            <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-gray-200/50">
              {/* Status - Always editable inline */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">Status:</span>
                <select
                  value={formData.statusId}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updateMutation.isPending}
                  className={`px-3 py-1.5 text-sm font-medium rounded-xl border border-gray-300 bg-white/90 backdrop-blur-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer ${updateMutation.isPending ? 'opacity-50' : ''}`}
                >
                  <option value="">No Status</option>
                  {statuses.map((status: any) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates - Always editable inline */}
              <div className="flex items-center gap-2">
                <DatePickerPopover
                  value={formData.dueDate}
                  onChange={handleDueDateChange}
                  placeholder="Set due date"
                  className="w-auto min-w-[160px]"
                />
              </div>

              {/* Track Time */}
              <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100/50 rounded-xl px-2 py-1 transition-all duration-200">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Start</span>
              </div>

              {/* Assignees - Always editable inline */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">Assignee:</span>
                <select
                  value={formData.assigneeId}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  disabled={updateMutation.isPending}
                  className={`px-3 py-1.5 text-sm border border-gray-300 rounded-xl bg-white/90 backdrop-blur-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer ${updateMutation.isPending ? 'opacity-50' : ''}`}
                >
                  <option value="">Unassigned</option>
                  {teamUsers.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority - Always editable inline */}
              <div className="flex items-center gap-2">
                <PrioritySelector
                  value={formData.priority}
                  onChange={handlePriorityChange}
                  layout="compact"
                />
              </div>

              {/* Tags */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">Tags:</span>
                <span className="text-sm text-gray-400">Empty</span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              {isEditing ? (
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[120px] border-gray-300 text-gray-900 rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm focus:shadow-md transition-all duration-200"
                  placeholder="Add a description..."
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
                  {task.description || "No description provided."}
                </p>
              )}
            </div>

            {/* Custom Fields Section */}
            <div className="border-t border-gray-200/50 pt-6">
              <button
                onClick={() => setShowCustomFields(!showCustomFields)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4 hover:text-gray-900 rounded-xl px-2 py-1 transition-all duration-200 hover:bg-gray-100/50"
              >
                {showCustomFields ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                Custom Fields
              </button>

              {showCustomFields && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Complexity */}
                  <div className="flex items-center justify-between bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                    <span className="text-sm text-gray-600 font-medium">Complexity</span>
                    {isEditing || editingField === "complexity" ? (
                      <div className="flex items-center gap-2">
                        <StarRating
                          value={formData.complexity}
                          onChange={(val) => {
                            setFormData({ ...formData, complexity: val });
                            if (!isEditing) {
                              handleFieldUpdate("complexity", val);
                              setEditingField(null);
                            }
                          }}
                          max={5}
                        />
                        {!isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingField(null)}
                            className="text-xs rounded-xl"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 transition-all duration-200 ${
                                i < (task.complexity || 0)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        {!isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingField("complexity")}
                            className="text-xs text-gray-500 rounded-xl hover:bg-gray-100/80"
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Progress - Always editable */}
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                    <ProgressBar
                      value={formData.progress}
                      onChange={(val) => {
                        setFormData({ ...formData, progress: val });
                        handleFieldUpdate("progress", val);
                      }}
                      editable={true}
                      showLabel={true}
                    />
                  </div>

                  {/* Empty Fields Placeholder */}
                  {/* <div className="text-xs text-gray-400 pt-2">
                    Hide 5 empty fields
                  </div> */}
                </div>
              )}
            </div>

            {/* Edit/Save Button */}
            {isEditing ? (
              <div className="mt-6 flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 px-6"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingField(null);
                  }}
                  className="border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="mt-6 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Edit Task
              </Button>
            )}
          </div>

          {/* Right Panel - Activity Sidebar with Glassmorphism */}
          <div className="w-80 border-l border-gray-200/50 bg-gradient-to-b from-gray-50/80 to-white/80 backdrop-blur-xl flex flex-col">
            {/* Activity Header */}
            <div className="px-4 py-3 border-b border-gray-200/50 bg-white/60 backdrop-blur-xl flex items-center justify-between rounded-tr-3xl">
              <h3 className="text-sm font-semibold text-gray-900">Activity</h3>
              <div className="flex items-center gap-1">
                {/* Search */}
                <div className="relative menu-container">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all duration-200"
                    onClick={() => setShowActivitySearch(!showActivitySearch)}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                  {showActivitySearch && (
                    <div className="absolute right-0 top-10 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Input
                        type="text"
                        placeholder="Search activity..."
                        value={activitySearchQuery}
                        onChange={(e) => setActivitySearchQuery(e.target.value)}
                        className="w-64 rounded-xl border-gray-300"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 hover:bg-gray-100/80 rounded-xl transition-all duration-200 relative ${
                    task?.isWatching ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={handleToggleWatch}
                  disabled={watchMutation.isPending}
                  title={task?.isWatching ? "Stop watching this task" : "Watch this task for updates"}
                >
                  <Bell className={`w-4 h-4 ${task?.isWatching ? 'fill-blue-600' : ''}`} />
                  {task?.watcherCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-medium rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                      {task.watcherCount}
                    </span>
                  )}
                </Button>
                <div className="relative menu-container">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all duration-200"
                    onClick={() => setShowActivityOptionsMenu(!showActivityOptionsMenu)}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                  {showActivityOptionsMenu && (
                    <div className="absolute right-0 top-10 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-2 min-w-[180px] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <button
                        onClick={() => {
                          setActivityFilter("all");
                          setShowActivityOptionsMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm rounded-xl transition-all duration-150 ${
                          activityFilter === "all"
                            ? "text-blue-600 bg-blue-50/80"
                            : "text-gray-700 hover:bg-gray-100/80"
                        }`}
                      >
                        Show all activity
                      </button>
                      <button
                        onClick={() => {
                          setActivityFilter("comments");
                          setShowActivityOptionsMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm rounded-xl transition-all duration-150 ${
                          activityFilter === "comments"
                            ? "text-blue-600 bg-blue-50/80"
                            : "text-gray-700 hover:bg-gray-100/80"
                        }`}
                      >
                        Comments only
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Activity Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {/* Task Creation Activity - only show when filter is "all" */}
              {activityFilter === "all" && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium">
                        {isCreator ? "You" : task.creator?.name || task.creator?.email || "Someone"} created this task
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(createdDate)} at {createdDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments */}
              {filteredComments.length > 0 && (
                <div className="space-y-4">
                  {filteredComments.map((comment: any) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <span className="text-white text-xs font-semibold">
                              {(comment.author.name || comment.author.email || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold text-gray-900">
                                {comment.author.name || comment.author.email}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatRelativeTime(comment.createdAt)} at{" "}
                                {new Date(comment.createdAt).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {comment.content}
                            </p>
                            <div className="flex items-center gap-4 mt-3">
                              <button
                                onClick={() => handleReaction(comment.id, "like")}
                                disabled={reactionMutation.isPending}
                                className={`text-xs flex items-center gap-1 rounded-xl px-2 py-1 transition-all duration-200 ${
                                  comment.userReaction === "like"
                                    ? "text-blue-600 bg-blue-50/80"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/80"
                                }`}
                              >
                                <ThumbsUp className={`w-3 h-3 ${comment.userReaction === "like" ? "fill-blue-600" : ""}`} />
                                {comment._count?.likes > 0 && <span>{comment._count.likes}</span>}
                              </button>
                              <button
                                onClick={() => handleReaction(comment.id, "dislike")}
                                disabled={reactionMutation.isPending}
                                className={`text-xs flex items-center gap-1 rounded-xl px-2 py-1 transition-all duration-200 ${
                                  comment.userReaction === "dislike"
                                    ? "text-red-600 bg-red-50/80"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/80"
                                }`}
                              >
                                <ThumbsDown className={`w-3 h-3 ${comment.userReaction === "dislike" ? "fill-red-600" : ""}`} />
                                {comment._count?.dislikes > 0 && <span>{comment._count.dislikes}</span>}
                              </button>
                              <button
                                onClick={() => handleCopyComment(comment.content)}
                                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 rounded-xl px-2 py-1 hover:bg-gray-100/80 transition-all duration-200"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                className={`text-xs rounded-xl px-2 py-1 transition-all duration-200 flex items-center gap-1 ${
                                  replyingTo === comment.id
                                    ? "text-blue-700 bg-blue-100"
                                    : "text-blue-600 hover:text-blue-700 hover:bg-blue-50/50"
                                }`}
                              >
                                <MessageSquare className="w-3 h-3" />
                                {comment.replies?.length > 0 ? `${comment.replies.length} Replies` : "Reply"}
                                {replyingTo === comment.id && <ChevronUp className="w-3 h-3" />}
                                {replyingTo !== comment.id && comment.replies?.length > 0 && <ChevronDown className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Thread Window - Opens when clicking Reply */}
                      {replyingTo === comment.id && (
                        <div className="ml-6 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="bg-gradient-to-b from-blue-50/80 to-white/80 backdrop-blur-sm rounded-2xl border border-blue-200/50 overflow-hidden shadow-sm">
                            {/* Thread Header */}
                            <div className="px-4 py-2 bg-blue-100/50 border-b border-blue-200/30 flex items-center justify-between">
                              <span className="text-xs font-medium text-blue-700">
                                Thread • {comment.replies?.length || 0} replies
                              </span>
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText("");
                                }}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded-lg hover:bg-blue-200/50 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Replies List */}
                            <div className="max-h-[250px] overflow-y-auto p-3 space-y-3">
                              {comment.replies && comment.replies.length > 0 ? (
                                comment.replies.map((reply: any) => (
                                  <div key={reply.id} className="bg-white/80 rounded-xl p-3 border border-gray-200/30">
                                    <div className="flex items-start gap-2">
                                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-[10px] font-semibold">
                                          {(reply.author.name || reply.author.email || "?").charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <p className="text-xs font-semibold text-gray-900">
                                            {reply.author.name || reply.author.email}
                                          </p>
                                          <p className="text-[10px] text-gray-500">
                                            {formatRelativeTime(reply.createdAt)}
                                          </p>
                                        </div>
                                        <p className="text-xs text-gray-700 whitespace-pre-wrap">
                                          {reply.content}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2">
                                          <button
                                            onClick={() => handleReaction(reply.id, "like")}
                                            disabled={reactionMutation.isPending}
                                            className={`text-[10px] flex items-center gap-1 rounded-lg px-1.5 py-0.5 transition-all duration-200 ${
                                              reply.userReaction === "like"
                                                ? "text-blue-600 bg-blue-50/80"
                                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/80"
                                            }`}
                                          >
                                            <ThumbsUp className={`w-2.5 h-2.5 ${reply.userReaction === "like" ? "fill-blue-600" : ""}`} />
                                            {reply._count?.likes > 0 && <span>{reply._count.likes}</span>}
                                          </button>
                                          <button
                                            onClick={() => handleReaction(reply.id, "dislike")}
                                            disabled={reactionMutation.isPending}
                                            className={`text-[10px] flex items-center gap-1 rounded-lg px-1.5 py-0.5 transition-all duration-200 ${
                                              reply.userReaction === "dislike"
                                                ? "text-red-600 bg-red-50/80"
                                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/80"
                                            }`}
                                          >
                                            <ThumbsDown className={`w-2.5 h-2.5 ${reply.userReaction === "dislike" ? "fill-red-600" : ""}`} />
                                            {reply._count?.dislikes > 0 && <span>{reply._count.dislikes}</span>}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-4 text-xs text-gray-500">
                                  No replies yet. Be the first to reply!
                                </div>
                              )}
                            </div>

                            {/* Reply Input */}
                            <div className="p-3 border-t border-blue-200/30 bg-white/50">
                              <div className="flex gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-[10px] font-semibold">
                                    {(session?.user?.name || session?.user?.email || "?").charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 flex gap-2">
                                  <Input
                                    placeholder="Write a reply..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleReply(comment.id);
                                      }
                                      if (e.key === "Escape") {
                                        setReplyingTo(null);
                                        setReplyText("");
                                      }
                                    }}
                                    className="flex-1 rounded-xl text-sm h-9 border-gray-300"
                                    autoFocus
                                  />
                                  <Button
                                    onClick={() => handleReply(comment.id)}
                                    disabled={!replyText.trim() || replyMutation.isPending}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 px-3"
                                  >
                                    {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comment Input */}
            <div className="border-t border-gray-200/50 bg-white/80 backdrop-blur-xl p-4 rounded-br-3xl">
              <Textarea
                placeholder="Mention @Brain to create, find, ask anything"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleAddComment();
                  }
                }}
                className="min-h-[80px] border-gray-300 text-gray-900 rounded-2xl mb-2 resize-none bg-white/90 backdrop-blur-sm shadow-sm focus:shadow-md transition-all duration-200"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all duration-200"
                    onClick={() => {/* Handle file upload */}}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all duration-200"
                    onClick={handleAddImage}
                  >
                    <Image className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all duration-200"
                    onClick={handleAddLink}
                  >
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all duration-200"
                    onClick={handleMention}
                  >
                    <AtSign className="w-4 h-4" />
                  </Button>
                  <div className="relative emoji-picker-container">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all duration-200"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile className="w-4 h-4" />
                    </Button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-12 right-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-3 z-50 w-64 max-h-64 overflow-y-auto emoji-picker-container">
                        <div className="grid grid-cols-8 gap-1">
                          {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleAddEmoji(emoji)}
                              className="text-2xl hover:bg-gray-100 rounded-lg p-1 transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || commentMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                >
                  {commentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
            <DialogDescription>
              Enter the URL and optional display text for your link
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="linkUrl">URL</Label>
              <Input
                id="linkUrl"
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="rounded-xl"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkText">Display Text (optional)</Label>
              <Input
                id="linkText"
                type="text"
                placeholder="Link text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowLinkDialog(false);
                setLinkUrl("");
                setLinkText("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmLink} disabled={!linkUrl}>
              Add Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mention Dialog */}
      <Dialog open={showMentionDialog} onOpenChange={setShowMentionDialog}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Mention User</DialogTitle>
            <DialogDescription>
              Search and select a team member to mention
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mentionSearch">Search</Label>
              <Input
                id="mentionSearch"
                type="text"
                placeholder="Search by name or email..."
                value={mentionQuery}
                onChange={(e) => setMentionQuery(e.target.value)}
                className="rounded-xl"
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member: any) => (
                  <button
                    key={member.id}
                    onClick={() => handleConfirmMention(member.name || member.email)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {(member.name || member.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.name || member.email}
                      </p>
                      {member.name && (
                        <p className="text-xs text-gray-500">{member.email}</p>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No members found</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMentionDialog(false);
                setMentionQuery("");
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
