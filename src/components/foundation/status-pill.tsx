import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/validation/foundation";
import type { ApplicationStatus } from "@/types/database";

const TONE: Record<ApplicationStatus, string> = {
  new: "border-lavender text-lavender-text",
  reviewing: "border-warning text-warning",
  shortlisted: "border-border-strong text-fg",
  approved: "border-success text-success",
  declined: "border-border-strong text-muted",
  funded: "border-success bg-success/10 text-success",
};

/** Application status pill (mono, uppercase — same family as the visibility pill). */
export function StatusPill({ status, className }: { status: ApplicationStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 font-mono text-[11px] uppercase",
        TONE[status],
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export function formatCad(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
}
