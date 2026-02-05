"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Flag, Calendar, User, Star, AlertTriangle, ArrowUp, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateTaskModal } from "./CreateTaskModal";
import { PriorityBadge } from "@/components/ui/priority-selector";

interface TaskListViewProps {
  taskListId: string;
  onTaskSelect: (taskId: string) => void;
  searchQuery: string;
  filterPriority?: string | null;
}

export function TaskListView({ taskListId, onTaskSelect, searchQuery, filterPriority }: TaskListViewProps) {
  const queryClient = useQueryClient();
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createTaskStatusId, setCreateTaskStatusId] = useState<string | null>(null);

  // Fetch task list with statuses
  const { data: taskListData, isLoading } = useQuery({
    queryKey: ["crm-task-list", taskListId],
    queryFn: async () => {
      const res = await fetch(`/api/crm/task-lists/${taskListId}`);
      if (!res.ok) throw new Error("Failed to fetch task list");
      return res.json();
    },
  });

  const taskList = taskListData?.taskList;
  const statuses = taskList?.statuses || [];

  // Fetch tasks for each status
  const { data: tasksData } = useQuery({
    queryKey: ["crm-tasks", taskListId],
    queryFn: async () => {
      const res = await fetch(`/api/crm/tasks?taskListId=${taskListId}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const allTasks = tasksData?.tasks || [];
  
  // Group tasks by status
  const tasksByStatus = statuses.reduce((acc: any, status: any) => {
    acc[status.id] = allTasks.filter((task: any) => {
      // Match tasks with this statusId
      return task.statusId === status.id;
    });
    return acc;
  }, {});
  
  // Put tasks without status in the first status column
  const tasksWithoutStatus = allTasks.filter((task: any) => !task.statusId || task.statusId === "");
  if (tasksWithoutStatus.length > 0 && statuses.length > 0) {
    const firstStatusId = statuses[0].id;
    if (!tasksByStatus[firstStatusId]) {
      tasksByStatus[firstStatusId] = [];
    }
    tasksByStatus[firstStatusId] = [...(tasksByStatus[firstStatusId] || []), ...tasksWithoutStatus];
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "text-red-600";
      case "HIGH":
        return "text-orange-600";
      case "NORMAL":
        return "text-blue-600";
      case "LOW":
        return "text-gray-500";
      default:
        return "text-gray-400";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDrop = async (statusId: string) => {
    if (!draggedTask) return;

    try {
      const res = await fetch(`/api/crm/tasks/${draggedTask}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusId: statusId || null }),
      });
      if (!res.ok) throw new Error("Failed to update task status");
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["crm-tasks", taskListId] });
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
    } catch (error) {
      console.error("Failed to update task status:", error);
    } finally {
      setDraggedTask(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-x-auto overflow-y-hidden bg-gray-50/50">
      <div className="flex gap-4 h-full p-5 min-w-max">
        {statuses.map((status: any) => {
          const tasks = tasksByStatus[status.id] || [];
          const filteredTasks = tasks.filter((task: any) => {
            // Filter by search query
            if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) {
              return false;
            }
            // Filter by priority
            if (filterPriority && task.priority !== filterPriority) {
              return false;
            }
            return true;
          });

          return (
            <div
              key={status.id}
              className="w-80 flex-shrink-0 flex flex-col crm-kanban-column transition-all duration-200"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("ring-2", "ring-blue-400/50", "bg-blue-50/30");
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove("ring-2", "ring-blue-400/50", "bg-blue-50/30");
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove("ring-2", "ring-blue-400/50", "bg-blue-50/30");
                handleDrop(status.id);
              }}
            >
              {/* Status Header */}
              <div className="mb-3">
                <div className="inline-flex items-center gap-3 bg-white rounded-lg px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: status.color || "#6b7280" }}
                    />
                    <h3 className="font-semibold text-gray-700 text-sm">{status.name}</h3>
                  </div>
                  <span className="text-xs text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                    {filteredTasks.length}
                  </span>
                </div>
              </div>

              {/* Tasks */}
              <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[calc(100vh-280px)] pr-1">
                {filteredTasks.map((task: any) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      handleDragStart(task.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.currentTarget.style.opacity = "0.5";
                    }}
                    onDragEnd={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                    onClick={() => onTaskSelect(task.id)}
                    className={`crm-task-card p-4 rounded-xl cursor-move group active:cursor-grabbing ${
                      task.priority === "URGENT" ? "priority-urgent border-red-200" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900 flex-1 leading-snug group-hover:text-blue-600 transition-colors">
                        {task.name}
                      </h4>
                      {task.taskId && (
                        <span className="text-[10px] text-gray-400 ml-2 font-mono bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100">
                          {task.taskId}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {task.assignee && (
                        <div className="flex items-center gap-1">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm ring-2 ring-white">
                            {task.assignee.name?.charAt(0) || task.assignee.email?.charAt(0) || "?"}
                          </div>
                        </div>
                      )}
                      {task.priority && task.priority !== "NORMAL" && (
                        <PriorityBadge priority={task.priority} size="sm" />
                      )}
                      {task.dueDate && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50/80 backdrop-blur-sm px-2 py-1 rounded-md border border-gray-100">
                          <Calendar className="w-3 h-3" />
                          <span className="font-medium">{formatDate(task.dueDate)}</span>
                        </div>
                      )}
                      {task.complexity > 0 && (
                        <div className="flex items-center gap-0.5 bg-amber-50/80 px-1.5 py-0.5 rounded-md border border-amber-100">
                          {Array.from({ length: Math.min(task.complexity, 5) }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      )}
                    </div>

                    {task.progress > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Progress</span>
                          <span className="text-xs text-gray-600 font-semibold">{task.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {task._count?.comments > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-1.5">
                        <span className="text-sm">💬</span>
                        <span>{task._count.comments} comment{task._count.comments !== 1 ? "s" : ""}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Task Button */}
                <button
                  className="w-full mt-1 py-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-white/50"
                  onClick={() => {
                    setCreateTaskStatusId(status.id);
                    setShowCreateTask(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Task
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        open={showCreateTask}
        onClose={() => {
          setShowCreateTask(false);
          setCreateTaskStatusId(null);
        }}
        taskListId={taskListId}
        defaultStatusId={createTaskStatusId || undefined}
      />
    </div>
  );
}
