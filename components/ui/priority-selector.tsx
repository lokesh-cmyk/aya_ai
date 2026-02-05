"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Flag, AlertTriangle, ArrowUp, Minus } from "lucide-react"

type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT"

interface PriorityOption {
  value: Priority
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: React.ReactNode
}

const PRIORITY_OPTIONS: PriorityOption[] = [
  {
    value: "LOW",
    label: "Low",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: <Minus className="w-3.5 h-3.5" />,
  },
  {
    value: "NORMAL",
    label: "Normal",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: <Flag className="w-3.5 h-3.5" />,
  },
  {
    value: "HIGH",
    label: "High",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    icon: <ArrowUp className="w-3.5 h-3.5" />,
  },
  {
    value: "URGENT",
    label: "Urgent",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
]

interface PrioritySelectorProps {
  value: Priority
  onChange: (priority: Priority) => void
  layout?: "horizontal" | "vertical" | "compact"
  className?: string
  disabled?: boolean
}

export function PrioritySelector({
  value,
  onChange,
  layout = "horizontal",
  className,
  disabled = false,
}: PrioritySelectorProps) {
  if (layout === "compact") {
    return (
      <div className={cn("flex gap-1", className)}>
        {PRIORITY_OPTIONS.map((option) => {
          const isSelected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                "border",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                isSelected
                  ? cn(option.bgColor, option.borderColor, option.color)
                  : "bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              title={option.label}
            >
              {option.icon}
            </button>
          )
        })}
      </div>
    )
  }

  if (layout === "vertical") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {PRIORITY_OPTIONS.map((option) => {
          const isSelected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
                "border text-sm font-medium",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                isSelected
                  ? cn(option.bgColor, option.borderColor, option.color, "shadow-sm")
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className={isSelected ? option.color : "text-gray-400"}>
                {option.icon}
              </span>
              {option.label}
            </button>
          )
        })}
      </div>
    )
  }

  // Horizontal layout (default)
  return (
    <div className={cn("flex gap-2", className)}>
      {PRIORITY_OPTIONS.map((option) => {
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-200",
              "border text-sm font-medium",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
              isSelected
                ? cn(option.bgColor, option.borderColor, option.color, "shadow-sm")
                : "bg-white/80 backdrop-blur-sm border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-white",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className={isSelected ? option.color : "text-gray-400"}>
              {option.icon}
            </span>
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

// Badge variant for display only
interface PriorityBadgeProps {
  priority: Priority
  className?: string
  size?: "sm" | "md"
}

export function PriorityBadge({ priority, className, size = "md" }: PriorityBadgeProps) {
  const option = PRIORITY_OPTIONS.find((o) => o.value === priority) || PRIORITY_OPTIONS[1]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-md border",
        option.bgColor,
        option.borderColor,
        option.color,
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm",
        className
      )}
    >
      <span className={option.color}>{option.icon}</span>
      {option.label}
    </span>
  )
}

export default PrioritySelector
