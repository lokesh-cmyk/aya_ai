"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  onChange?: (value: number) => void;
  editable?: boolean;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  onChange,
  editable = false,
  className,
  showLabel = true
}: ProgressBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const calculateValue = useCallback((clientX: number) => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    return Math.round(percentage);
  }, [value]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!editable || !onChange) return;
    e.preventDefault();
    setIsDragging(true);
    const newValue = calculateValue(e.clientX);
    onChange(newValue);
  };

  const handleTrackHover = (e: React.MouseEvent) => {
    if (!editable) return;
    const newValue = calculateValue(e.clientX);
    setHoverValue(newValue);
  };

  const handleTrackLeave = () => {
    setHoverValue(null);
  };

  // Handle global mouse events during drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!onChange) return;
      const newValue = calculateValue(e.clientX);
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onChange, calculateValue]);

  const displayPercentage = isDragging || hoverValue !== null
    ? (hoverValue !== null && !isDragging ? hoverValue : value)
    : value;

  const getProgressColor = (percent: number) => {
    if (percent < 30) return 'linear-gradient(to right, #ef4444, #f87171)';
    if (percent < 70) return 'linear-gradient(to right, #f59e0b, #fbbf24)';
    return 'linear-gradient(to right, #22c55e, #4ade80)';
  };

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className={cn(
            "text-sm font-semibold transition-all duration-150 tabular-nums",
            isDragging ? "text-blue-600 scale-110" : "text-gray-900"
          )}>
            {value}%
          </span>
        </div>
      )}

      <div
        ref={trackRef}
        className={cn(
          "relative h-5 rounded-full overflow-visible transition-all duration-200 select-none",
          editable ? "cursor-pointer" : "",
          isDragging ? "ring-2 ring-blue-400/50" : ""
        )}
        style={{
          background: 'linear-gradient(to bottom, #e5e7eb, #f3f4f6)'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleTrackHover}
        onMouseLeave={handleTrackLeave}
      >
        {/* Track background with inner shadow */}
        <div className="absolute inset-0 rounded-full shadow-inner" />

        {/* Progress fill */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all shadow-sm",
            isDragging ? "duration-0" : "duration-200"
          )}
          style={{
            width: `${value}%`,
            background: getProgressColor(value)
          }}
        />

        {/* Hover preview indicator */}
        {editable && hoverValue !== null && !isDragging && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-blue-400/40 rounded-full transition-all duration-75 pointer-events-none"
            style={{ left: `calc(${hoverValue}% - 2px)` }}
          />
        )}

        {/* Drag handle */}
        {editable && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-lg transition-all",
              "border-2 flex items-center justify-center",
              isDragging
                ? "border-blue-500 scale-110 shadow-xl"
                : "border-gray-300 hover:border-blue-400 hover:scale-105 hover:shadow-xl"
            )}
            style={{
              left: `calc(${value}% - 12px)`,
              transition: isDragging ? 'transform 0.1s, border-color 0.1s' : 'all 0.2s ease'
            }}
          >
            <div className="flex gap-0.5">
              <div className="w-0.5 h-2.5 bg-gray-300 rounded-full" />
              <div className="w-0.5 h-2.5 bg-gray-300 rounded-full" />
            </div>
          </div>
        )}
      </div>

      {/* Quick select markers */}
      {editable && (
        <div className="flex justify-between px-0.5 pt-1">
          {[0, 25, 50, 75, 100].map((mark) => (
            <button
              key={mark}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onChange?.(mark);
              }}
              className={cn(
                "text-[10px] font-medium transition-all duration-150 px-1.5 py-0.5 rounded-md",
                value === mark
                  ? "text-blue-600 bg-blue-50 ring-1 ring-blue-200"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              )}
            >
              {mark}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
