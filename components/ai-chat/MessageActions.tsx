"use client";

import React, { useState } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageActionsProps {
  content: string;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
  className?: string;
}

export function MessageActions({
  content,
  onRegenerate,
  showRegenerate = false,
  className = '',
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150',
        className
      )}
    >
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        title={copied ? 'Copied!' : 'Copy to clipboard'}
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
      {showRegenerate && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          title="Regenerate response"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default MessageActions;
