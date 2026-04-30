import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * IM Vision 2026 — Card
 * Apple-style elevated surface: large radius, hairline border via inset shadow,
 * subtle inner highlight + outer drop, supports `glass` and `interactive`.
 */
const Card = React.forwardRef(
  ({ className, glass = false, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative rounded-2xl text-card-foreground",
        glass
          ? "glass"
          : "bg-surface-1 hairline-strong shadow-card-1",
        interactive && "transition-all duration-300 ease-apple hover:-translate-y-0.5 hover:shadow-card-2 hover:bg-surface-2",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-1 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "font-display text-lg leading-tight tracking-tight text-foreground",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-snug text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 pb-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center gap-3 px-6 py-4 border-t border-white/[0.06]",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
