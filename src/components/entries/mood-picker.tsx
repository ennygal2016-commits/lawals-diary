"use client";

import { MOODS, type Mood } from "@/lib/moods";
import { cn } from "@/lib/utils";

/**
 * DESIGN.md §3 Mood picker: 4 × 2 grid of 72 px tiles, a 14 px mood dot over a 12 px label. Mood is optional, so
 * these are toggle buttons (press the selected one again to clear it). Selected: 2 px border in the mood colour,
 * --selected fill, dot glow.
 */
export function MoodPicker({
  value,
  onChange,
  labelId,
}: {
  value: Mood | null;
  onChange: (mood: Mood | null) => void;
  labelId: string;
}) {
  return (
    <div role="group" aria-labelledby={labelId} className="grid grid-cols-4 gap-2 md:gap-3">
      {MOODS.map((mood) => {
        const selected = value === mood.value;
        return (
          <button
            key={mood.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : mood.value)}
            className={cn(
              "flex h-[72px] flex-col items-center justify-center gap-2 rounded-btn-lg border text-[12px] text-fg-soft transition-colors md:text-[13px]",
              selected
                ? "border-2 bg-selected text-fg"
                : "border-border bg-surface hover:border-border-strong",
            )}
            style={selected ? { borderColor: mood.color } : undefined}
          >
            <span
              aria-hidden
              className="size-3.5 rounded-full"
              style={{ background: mood.color, boxShadow: selected ? `0 0 12px ${mood.color}` : undefined }}
            />
            {mood.label}
          </button>
        );
      })}
    </div>
  );
}
