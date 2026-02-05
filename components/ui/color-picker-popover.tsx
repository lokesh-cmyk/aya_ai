"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Curated color palette
const PRESET_COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Gray", value: "#6b7280" },
]

interface ColorPickerPopoverProps {
  value: string
  onChange: (color: string) => void
  className?: string
  disabled?: boolean
}

export function ColorPickerPopover({
  value,
  onChange,
  className,
  disabled = false,
}: ColorPickerPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const [customColor, setCustomColor] = React.useState(value)

  React.useEffect(() => {
    setCustomColor(value)
  }, [value])

  const handleColorSelect = (color: string) => {
    onChange(color)
    setCustomColor(color)
    setOpen(false)
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    setCustomColor(newColor)
    // Validate hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
      onChange(newColor)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            "h-10 px-3 py-2",
            "bg-white/80 backdrop-blur-sm",
            "border border-gray-200 hover:border-gray-300",
            "rounded-lg",
            "transition-all duration-200",
            "hover:bg-white hover:shadow-sm",
            "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400",
            className
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-md shadow-sm ring-1 ring-black/10"
              style={{ backgroundColor: value }}
            />
            <span className="text-gray-600 text-sm font-mono">{value.toUpperCase()}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-64 p-0 z-[100]",
          "bg-white/95 backdrop-blur-xl",
          "border border-gray-200/60",
          "shadow-xl shadow-gray-900/10",
          "rounded-xl overflow-hidden"
        )}
        align="start"
        sideOffset={8}
      >
        {/* Color Grid */}
        <div className="p-3">
          <div className="grid grid-cols-8 gap-1.5 mb-3">
            {PRESET_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => handleColorSelect(color.value)}
                className={cn(
                  "w-6 h-6 rounded-md transition-all duration-150",
                  "hover:scale-110 hover:shadow-md",
                  "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500",
                  "ring-1 ring-black/10"
                )}
                style={{ backgroundColor: color.value }}
                title={color.name}
              >
                {value.toLowerCase() === color.value.toLowerCase() && (
                  <Check className="w-4 h-4 text-white mx-auto drop-shadow-sm" />
                )}
              </button>
            ))}
          </div>

          {/* Custom Color Input */}
          <div className="pt-3 border-t border-gray-100">
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
              Custom color
            </label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 appearance-none bg-transparent"
                  style={{
                    WebkitAppearance: 'none',
                  }}
                />
                <div
                  className="absolute inset-0 rounded-lg pointer-events-none ring-1 ring-black/10"
                  style={{ backgroundColor: customColor }}
                />
              </div>
              <Input
                value={customColor}
                onChange={handleCustomColorChange}
                placeholder="#000000"
                className="h-10 font-mono text-sm bg-gray-50 border-gray-200 rounded-lg"
                maxLength={7}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default ColorPickerPopover
