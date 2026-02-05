"use client"

import * as React from "react"
import { format, addDays, addWeeks } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerPopoverProps {
  value?: Date | string
  onChange: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePickerPopover({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled = false,
}: DatePickerPopoverProps) {
  const [open, setOpen] = React.useState(false)

  // Convert string to Date if needed
  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return value
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? undefined : parsed
  }, [value])

  const handleSelect = (date: Date | undefined) => {
    onChange(date)
    if (date) setOpen(false)
  }

  const handleQuickSelect = (date: Date | undefined) => {
    onChange(date)
    setOpen(false)
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
            !dateValue && "text-gray-500",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
          {dateValue ? (
            <span className="text-gray-900">{format(dateValue, "PPP")}</span>
          ) : (
            <span>{placeholder}</span>
          )}
          {dateValue && (
            <X
              className="ml-auto h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onChange(undefined)
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-auto p-0 z-[100]",
          "bg-white/95 backdrop-blur-xl",
          "border border-gray-200/60",
          "shadow-xl shadow-gray-900/10",
          "rounded-xl overflow-hidden"
        )}
        align="start"
        sideOffset={8}
      >
        {/* Quick Select Buttons */}
        <div className="flex gap-1 p-3 border-b border-gray-100 bg-gray-50/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickSelect(new Date())}
            className="h-7 px-2.5 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickSelect(addDays(new Date(), 1))}
            className="h-7 px-2.5 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md"
          >
            Tomorrow
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickSelect(addWeeks(new Date(), 1))}
            className="h-7 px-2.5 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md"
          >
            Next Week
          </Button>
          {dateValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickSelect(undefined)}
              className="h-7 px-2.5 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md ml-auto"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Calendar */}
        <div className="p-3">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={handleSelect}
            initialFocus
            className="rounded-lg"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default DatePickerPopover
