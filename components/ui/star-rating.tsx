"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  className?: string;
}

export function StarRating({ value, onChange, max = 5, className }: StarRatingProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: max }).map((_, index) => {
        const starValue = index + 1;
        return (
          <button
            key={index}
            type="button"
            onClick={() => onChange(starValue)}
            className="focus:outline-none transition-transform hover:scale-110"
            onMouseEnter={(e) => {
              // Optional: Add hover preview
            }}
          >
            <Star
              className={cn(
                "w-6 h-6 transition-colors",
                starValue <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-gray-200 text-gray-300"
              )}
            />
          </button>
        );
      })}
      {value > 0 && (
        <span className="ml-2 text-sm text-gray-600 font-medium">{value} star{value !== 1 ? "s" : ""}</span>
      )}
    </div>
  );
}
