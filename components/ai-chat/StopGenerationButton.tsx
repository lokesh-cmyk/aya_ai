"use client";

import React, { useEffect } from 'react';
import { Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StopGenerationButtonProps {
  onStop: () => void;
  className?: string;
}

export function StopGenerationButton({ onStop, className = '' }: StopGenerationButtonProps) {
  // Handle Escape key to stop generation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onStop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStop]);

  return (
    <button
      onClick={onStop}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full',
        'bg-gray-900 text-white hover:bg-gray-800',
        'shadow-lg animate-stop-pulse transition-all duration-200',
        'hover:scale-105 active:scale-95',
        className
      )}
    >
      <Square className="w-3 h-3 fill-current" />
      <span className="text-sm font-medium">Stop generating</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
        Esc
      </kbd>
    </button>
  );
}

export default StopGenerationButton;
