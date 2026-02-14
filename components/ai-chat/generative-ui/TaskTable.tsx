"use client";

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface Task {
  name: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  assignee?: string | null;
  project?: string | null;
}

interface TaskTableProps {
  data: Task | Task[];
}

function getPriorityColor(priority?: string): string {
  switch (priority?.toUpperCase()) {
    case 'URGENT': return 'bg-red-100 text-red-700';
    case 'HIGH': return 'bg-orange-100 text-orange-700';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
    case 'LOW': return 'bg-blue-100 text-blue-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function getStatusColor(status?: string): string {
  const s = status?.toUpperCase() || '';
  if (s.includes('DONE') || s.includes('COMPLETE') || s.includes('CLOSED')) return 'bg-green-100 text-green-700';
  if (s.includes('PROGRESS') || s.includes('ACTIVE')) return 'bg-blue-100 text-blue-700';
  if (s.includes('REVIEW')) return 'bg-purple-100 text-purple-700';
  if (s.includes('BLOCK')) return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const TaskTable = memo(function TaskTable({ data }: TaskTableProps) {
  const tasks = Array.isArray(data) ? data : [data];
  if (tasks.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden my-2">
      {/* Desktop: table layout */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-gray-600">Task</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Priority</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Due Date</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, i) => (
              <tr key={i} className={cn('border-b border-gray-100 last:border-0', i % 2 === 1 && 'bg-gray-50/50')}>
                <td className="px-3 py-2 font-medium text-gray-800 max-w-[200px] truncate">
                  {task.name}
                  {task.project && <span className="block text-xs text-gray-400">{task.project}</span>}
                </td>
                <td className="px-3 py-2">
                  <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(task.status))}>
                    {task.status || 'Open'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium', getPriorityColor(task.priority))}>
                    {task.priority || 'None'}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-600">{formatDate(task.dueDate)}</td>
                <td className="px-3 py-2 text-gray-600">{task.assignee || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card layout */}
      <div className="sm:hidden divide-y divide-gray-100">
        {tasks.map((task, i) => (
          <div key={i} className="p-3 space-y-1.5">
            <p className="font-medium text-gray-800 text-sm">{task.name}</p>
            {task.project && <p className="text-xs text-gray-400">{task.project}</p>}
            <div className="flex flex-wrap gap-1.5">
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(task.status))}>
                {task.status || 'Open'}
              </span>
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getPriorityColor(task.priority))}>
                {task.priority || 'None'}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatDate(task.dueDate)}</span>
              <span>{task.assignee || 'Unassigned'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
