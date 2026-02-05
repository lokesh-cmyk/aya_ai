import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const kbdVariants = cva(
  "inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-xs font-medium text-gray-600 shadow-sm",
  {
    variants: {
      variant: {
        default: "border-gray-200 bg-white text-gray-600",
        outline: "border-gray-300 bg-transparent text-gray-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface KbdProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof kbdVariants> {}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <kbd
        ref={ref}
        className={cn(kbdVariants({ variant }), className)}
        {...props}
      />
    )
  }
)
Kbd.displayName = "Kbd"

const KbdGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
})
KbdGroup.displayName = "KbdGroup"

export { Kbd, KbdGroup }
