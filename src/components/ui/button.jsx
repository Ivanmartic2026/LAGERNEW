import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"

/**
 * IM Vision 2026 — Button
 * Tesla / Apple style: pill radius, hairline borders, subtle neon glow on primary,
 * tight letter-spacing, soft press animation. No uppercase.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "rounded-full font-medium tracking-tight",
    "transition-[transform,background,box-shadow,opacity] duration-200 ease-apple",
    "active:scale-[0.97] focus-visible:outline-none",
    "focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // PRIMARY — white-on-black "Apple" pill, no neon (used for confirm)
        default:
          "bg-foreground text-background hover:bg-foreground/90 shadow-card-1",
        // SIGNAL — neon CTA (Tesla accent)
        signal:
          "bg-signal text-white hover:bg-signal-hi active:bg-signal-lo shadow-glow-signal",
        // SECONDARY — translucent surface, hairline
        secondary:
          "bg-white/[0.06] text-foreground hairline-strong hover:bg-white/[0.10]",
        // OUTLINE — minimal hairline
        outline:
          "bg-transparent text-foreground hairline hover:bg-white/[0.04]",
        // GHOST — invisible until hover
        ghost:
          "bg-transparent text-foreground/80 hover:text-foreground hover:bg-white/[0.06]",
        // DESTRUCTIVE
        destructive:
          "bg-status-bad text-white hover:bg-status-bad/90 shadow-card-1",
        // LINK
        link: "text-signal hover:text-signal-hi underline-offset-4 hover:underline rounded-md",
      },
      size: {
        sm:      "h-8  px-3 text-[13px]",
        default: "h-10 px-5 text-[14px]",
        lg:      "h-12 px-7 text-[15px]",
        xl:      "h-14 px-8 text-base",
        icon:    "h-10 w-10",
        "icon-sm": "h-8 w-8 [&_svg]:size-3.5",
        "icon-lg": "h-12 w-12 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
