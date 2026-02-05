// components/command-center/SpaceGroup.tsx

"use client";

import React, { useState } from "react";
import { Signal } from "@/lib/command-center/types";
import { SignalCard } from "./SignalCard";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpaceGroupProps {
  spaceName: string;
  signals: Signal[];
  defaultExpanded?: boolean;
  onNavigate?: (signal: Signal) => void;
}

export function SpaceGroup({
  spaceName,
  signals,
  defaultExpanded = true,
  onNavigate,
}: SpaceGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-700">{spaceName}</span>
        </div>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          {signals.length}
        </span>
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-1 pb-2">
          {signals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  );
}
