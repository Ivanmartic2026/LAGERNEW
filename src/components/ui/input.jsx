import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * IM Vision 2026 — Input
 * Tesla/Apple style: tall (44px touch), rounded-xl, hairline border that turns
 * neon-signal on focus, subtle inner top highlight on dark surfaces.
 */
const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl px-4 py-2 text-[15px] font-body",
        "bg-white/[0.04] text-foreground placeholder:text-muted-foreground/70",
        "hairline-strong",
        "transition-[box-shadow,background] duration-200 ease-apple",
        "focus-visible:outline-none focus-visible:bg-white/[0.06]",
        "focus-visible:[box-shadow:inset_0_0_0_1px_hsl(var(--signal)/0.7),0_0_0_4px_hsl(var(--signal)/0.18)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      ref={ref}
      {...props}
    />
  );
})
Input.displayName = "Input"

export { Input }
