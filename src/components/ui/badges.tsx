import { Globe, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { initialOf, type PartnerKey } from "@/lib/site";
import { moodByValue, type Mood } from "@/lib/moods";

/* ------------------------------------------------------------------ InitialChip */

/** DESIGN.md §3 Initial chip — 22–24px circle in the author's colour. Screen readers hear the name. */
export function InitialChip({
  name,
  partner,
  size = "md",
  className,
}: {
  name: string;
  partner: PartnerKey;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border font-semibold",
        size === "sm" ? "size-[22px] text-[11px]" : "size-6 text-[12px]",
        partner === "a" ? "border-accent text-accent" : "border-lavender text-lavender",
        className,
      )}
    >
      <span aria-hidden>{initialOf(name)}</span>
      <span className="visually-hidden">{name}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ VisibilityBadge */

export type Visibility = "private" | "public";

/**
 * DESIGN.md §3 Visibility badge — the lock/globe signal that appears on every item.
 * pill:    mono uppercase text in a bordered 32px pill (timeline rows)
 * overlay: blurred dark pill over a photo (entry cards)
 * icon:    24px circle, icon only, over a photo tile (photo grid)
 */
export function VisibilityBadge({
  visibility,
  variant = "pill",
  className,
}: {
  visibility: Visibility;
  variant?: "pill" | "overlay" | "icon";
  className?: string;
}) {
  const isPublic = visibility === "public";
  const Icon = isPublic ? Globe : Lock;
  const label = isPublic ? "Public" : "Private";

  if (variant === "icon") {
    return (
      <span
        role="img"
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full bg-[rgba(14,12,20,0.7)] backdrop-blur-md",
          isPublic ? "text-lavender" : "text-fg",
          className,
        )}
      >
        <Icon aria-hidden className="size-3.5" strokeWidth={2} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-mono",
        variant === "pill"
          ? cn(
              "h-8 border border-border-strong px-3 text-[11px] uppercase",
              isPublic ? "text-lavender" : "text-muted",
            )
          : "h-7 bg-[rgba(14,12,20,0.7)] px-2.5 text-[12px] text-fg backdrop-blur-md",
        className,
      )}
    >
      <Icon aria-hidden className="size-3" strokeWidth={2} />
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ MoodDot */

/** Nocturne shows moods as a coloured dot plus the label (never colour alone — WCAG 1.4.1). */
export function MoodDot({
  mood,
  showLabel = true,
  className,
}: {
  mood: Mood;
  showLabel?: boolean;
  className?: string;
}) {
  const m = moodByValue(mood);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: m.color }} />
      {showLabel ? m.label : <span className="visually-hidden">{m.label}</span>}
    </span>
  );
}
