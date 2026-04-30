import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"

/**
 * IM Vision 2026 — Badge
 * Pill, tabular numerals, hairline border, low-saturation tinted bg.
 * Replaces the kindergarten 100/800 palette with theme-aware HSL tints.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[11px] font-medium tracking-tight num-tabular transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-signal/15 text-signal-hi [box-shadow:inset_0_0_0_1px_hsl(var(--signal)/0.35)]",
        secondary:
          "bg-white/[0.06] text-foreground/85 hairline-strong",
        outline:
          "bg-transparent text-foreground/85 hairline-strong",
        verified:
          "bg-status-ok/15 text-status-ok [box-shadow:inset_0_0_0_1px_hsl(var(--status-ok)/0.30)]",
        pending:
          "bg-status-warn/15 text-status-warn [box-shadow:inset_0_0_0_1px_hsl(var(--status-warn)/0.30)]",
        quarantine:
          "bg-status-bad/15 text-status-bad [box-shadow:inset_0_0_0_1px_hsl(var(--status-bad)/0.30)]",
        blocked:
          "bg-status-warn/15 text-status-warn [box-shadow:inset_0_0_0_1px_hsl(var(--status-warn)/0.30)]",
        info:
          "bg-status-info/15 text-status-info [box-shadow:inset_0_0_0_1px_hsl(var(--status-info)/0.30)]",
        destructive:
          "bg-status-bad/15 text-status-bad [box-shadow:inset_0_0_0_1px_hsl(var(--status-bad)/0.30)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants }
