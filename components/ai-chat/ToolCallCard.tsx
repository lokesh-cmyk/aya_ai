"use client";

import React, { useState, memo } from 'react';
import { CheckCircle2, XCircle, Loader2, ChevronRight, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolCallCardProps {
  toolName: string;
  displayName: string;
  status: 'calling' | 'success' | 'error';
  summary?: string;
  args?: string;
  resultPreview?: string;
}

const statusConfig = {
  calling: {
    icon: <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />,
    bg: 'bg-blue-50/80',
    border: 'border-blue-200/60',
    label: 'Running...',
    labelColor: 'text-blue-500',
  },
  success: {
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    bg: 'bg-emerald-50/50',
    border: 'border-emerald-200/60',
    label: '',
    labelColor: 'text-emerald-600',
  },
  error: {
    icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
    bg: 'bg-red-50/50',
    border: 'border-red-200/60',
    label: 'Failed',
    labelColor: 'text-red-500',
  },
};

export const ToolCallCard = memo(function ToolCallCard({
  displayName,
  status,
  summary,
  args,
  resultPreview,
}: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = statusConfig[status];

  const hasExpandableContent = !!(summary || args || resultPreview);
  const canExpand = hasExpandableContent && status !== 'calling';

  return (
    <div
      className={cn(
        'rounded-lg border transition-all overflow-hidden',
        config.bg,
        config.border,
      )}
    >
      {/* Header row */}
      <button
        onClick={() => canExpand && setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
          canExpand && 'hover:bg-black/[0.03] cursor-pointer',
          !canExpand && 'cursor-default',
        )}
      >
        {config.icon}

        <Wrench className="w-3 h-3 text-gray-400 flex-shrink-0" />

        <span className="flex-1 text-[13px] text-gray-700 truncate">
          <span className="font-medium">{displayName}</span>
          {status === 'calling' && (
            <span className={cn('ml-1.5 italic text-xs', config.labelColor)}>
              {config.label}
            </span>
          )}
          {status !== 'calling' && summary && (
            <span className="text-gray-400 ml-1">
              &mdash; {summary}
            </span>
          )}
        </span>

        {canExpand && (
          <ChevronRight
            className={cn(
              'w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
          />
        )}
      </button>

      {/* Expandable detail section */}
      {isExpanded && canExpand && (
        <div className="border-t border-gray-200/60 px-3 py-2.5 space-y-2 bg-white/60">
          {/* Summary */}
          {summary && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
                Result
              </p>
              <p className="text-xs text-gray-600">{summary}</p>
            </div>
          )}

          {/* Args preview */}
          {args && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
                Parameters
              </p>
              <pre className="text-[11px] text-gray-500 bg-gray-50 rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
                {args}
              </pre>
            </div>
          )}

          {/* Result data preview */}
          {/* {resultPreview && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
                Response Data
              </p>
              <pre className="text-[11px] text-gray-500 bg-gray-50 rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed max-h-40 overflow-y-auto">
                {formatResultPreview(resultPreview)}
              </pre>
            </div>
          )} */}
        </div>
      )}
    </div>
  );
});

/** Try to pretty-print JSON, otherwise return as-is */
function formatResultPreview(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

export default ToolCallCard;
