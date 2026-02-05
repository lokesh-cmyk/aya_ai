"use client";

import React from 'react';

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className = '' }: TypingIndicatorProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span
        className="w-2 h-2 bg-gray-400 rounded-full animate-typing-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="w-2 h-2 bg-gray-400 rounded-full animate-typing-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="w-2 h-2 bg-gray-400 rounded-full animate-typing-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}

export default TypingIndicator;
