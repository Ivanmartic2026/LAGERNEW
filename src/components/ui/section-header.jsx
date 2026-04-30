import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SectionHeader — IM Vision 2026
 * Used as the headline above page sections (Home, dashboards, etc).
 * Tight tracking, large display weight, optional eyebrow + actions row.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4 flex-wrap", className)}>
      <div className="flex flex-col gap-1">
        {eyebrow && (
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/45">
            {eyebrow}
          </span>
        )}
        <h2 className="font-display tracking-tighter text-2xl md:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-foreground/60 max-w-prose">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export default SectionHeader;
