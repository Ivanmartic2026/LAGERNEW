import * as React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * KpiTile — IM Vision 2026
 * Apple/Tesla style KPI surface with a glass card, large tabular number,
 * tiny trend pill, and an optional sparkline-ready footer slot.
 *
 * Props:
 *  - label   string             Top label (small caps)
 *  - value   number|string      The big number
 *  - hint    string             Sub-label / unit
 *  - delta   number             Percent change; sign drives color/arrow
 *  - tone    "default"|"signal"|"ok"|"warn"|"bad"
 *  - icon    LucideIcon
 *  - glow    boolean            Adds a subtle neon glow frame
 *  - footer  ReactNode          Anything (e.g. a tiny chart)
 */
export function KpiTile({
  label,
  value,
  hint,
  delta,
  tone = "default",
  icon: Icon,
  glow = false,
  footer,
  className,
  onClick,
}) {
  const toneClass = {
    default: "",
    signal:  "[--tone:hsl(var(--signal))]",
    ok:      "[--tone:hsl(var(--status-ok))]",
    warn:    "[--tone:hsl(var(--status-warn))]",
    bad:     "[--tone:hsl(var(--status-bad))]",
  }[tone];

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-2xl glass p-5 overflow-hidden",
        "transition-transform duration-300 ease-apple",
        onClick && "cursor-pointer hover:-translate-y-0.5",
        glow && "stroke-gradient",
        toneClass,
        className,
      )}
    >
      {/* radial accent in corner */}
      {tone !== "default" && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-30 blur-2xl"
          style={{ background: "radial-gradient(circle, var(--tone), transparent 65%)" }}
        />
      )}

      <div className="relative flex items-start justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground/55">
          {label}
        </span>
        {Icon && (
          <span className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center hairline-strong",
            tone === "default" ? "text-foreground/70" : "text-[color:var(--tone)]",
          )}>
            <Icon className="w-4 h-4" />
          </span>
        )}
      </div>

      <div className="relative mt-3 flex items-baseline gap-2">
        <span className="font-display font-semibold tracking-tight num-tabular text-3xl md:text-4xl text-foreground">
          {value}
        </span>
        {hint && <span className="text-sm text-foreground/55 num-tabular">{hint}</span>}
      </div>

      {typeof delta === "number" && (
        <div className="mt-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[11px] num-tabular",
              delta >= 0
                ? "bg-status-ok/15 text-status-ok"
                : "bg-status-bad/15 text-status-bad",
            )}
          >
            {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        </div>
      )}

      {footer && <div className="relative mt-4">{footer}</div>}
    </div>
  );
}

export default KpiTile;
