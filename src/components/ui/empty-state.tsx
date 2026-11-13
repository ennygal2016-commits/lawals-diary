import type * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  message: React.ReactNode;
  /** One secondary button, e.g. "Write about it". */
  action?: React.ReactNode;
  /** The foundation version adds an icon and uses the dashed style. */
  icon?: LucideIcon;
  variant?: "panel" | "dashed";
  className?: string;
};

/**
 * DESIGN.md §3 Empty state — centred muted text and one secondary button.
 * panel: surface fill with a border.  dashed: dashed border, transparent (calendar, foundation).
 */
export function EmptyState({ message, action, icon: Icon, variant = "panel", className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-[16px] px-6 py-6 text-center md:py-8",
        variant === "panel" ? "border border-border bg-surface" : "border border-dashed border-border-muted",
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="size-6 text-muted" strokeWidth={1.75} /> : null}
      <p className="m-0 text-[15px] text-muted">{message}</p>
      {action}
    </div>
  );
}
