"use client";

import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
  className?: string;
}

export const StreamingMessage = memo(function StreamingMessage({
  content,
  isStreaming,
  className = '',
}: StreamingMessageProps) {
  return (
    <div className={`prose prose-sm max-w-none text-gray-800 ${className}`}>
      <ReactMarkdown>{content}</ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-0.5 h-5 bg-gray-600 ml-0.5 align-middle animate-blink" />
      )}
    </div>
  );
});

export default StreamingMessage;
