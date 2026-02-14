"use client";

import React, { useState, memo } from 'react';
import { CheckCircle2, XCircle, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolCallCardProps {
  toolName: string;
  displayName: string;
  status: 'calling' | 'success' | 'error';
  summary?: string;
}

export const ToolCallCard = memo(function ToolCallCard({
  displayName,
  status,
  summary,
}: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusIcon = {
    calling: <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />,
    success: <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />,
    error: <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
  };

  return (
    <button
      onClick={() => setIsExpanded(!isExpanded)}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all',
        'bg-gray-50/80 hover:bg-gray-100/80',
        status === 'error' ? 'border-red-200' : 'border-gray-200/80',
      )}
    >
      {statusIcon[status]}

      <span
        className={cn(
          'flex-1 text-sm',
          isExpanded ? 'whitespace-normal' : 'truncate',
          status === 'calling' ? 'text-gray-600' : 'text-gray-700',
        )}
      >
        <span className="font-medium">{displayName}</span>
        {status === 'calling' && (
          <span className="text-gray-400 italic ml-1">Running...</span>
        )}
        {status !== 'calling' && summary && (
          <span className="text-gray-500">: {summary}</span>
        )}
      </span>

      <ChevronDown
        className={cn(
          'w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200',
          isExpanded && 'rotate-180'
        )}
      />
    </button>
  );
});

export default ToolCallCard;
