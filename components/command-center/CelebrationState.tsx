// components/command-center/CelebrationState.tsx

"use client";

import React from "react";
import { Signal } from "@/lib/command-center/types";
import { CheckCircle2 } from "lucide-react";

interface CelebrationStateProps {
  shippedSignals: Signal[];
}

export function CelebrationState({ shippedSignals }: CelebrationStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
        <CheckCircle2 className="w-6 h-6 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">All clear</h3>
      <p className="text-sm text-gray-500 mb-6">
        No blocked, stale, or overdue items.
        <br />
        Your team is executing well.
      </p>

      {shippedSignals.length > 0 && (
        <div className="w-full border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 mb-3">
            Recently shipped (7 days)
          </p>
          <div className="space-y-2">
            {shippedSignals.slice(0, 5).map((signal) => (
              <div
                key={signal.id}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="truncate">{signal.title.replace('" shipped', '"')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
