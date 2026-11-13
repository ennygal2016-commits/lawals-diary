"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ChipProps = Omit<React.ComponentProps<"button">, "children"> & {
  children: React.ReactNode;
  selected?: boolean;
  /** Rendered in brackets after the label: "New (0)". */
  count?: number | string;
  /** Dashed outline, used for "More filters". */
  dashed?: boolean;
};

/**
 * DESIGN.md §3 Chip — 40px pill, 1px border. Selected chips use the inverse fill
 * (light with dark text). Toggle semantics via aria-pressed.
 */
export function Chip({ selected = false, count, dashed = false, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        selected
          ? "border-inverse bg-inverse text-inverse-ink"
          : "border-border-strong bg-transparent text-fg-soft hover:border-border-dashed hover:text-fg",
        dashed && !selected && "border-dashed border-border-dashed",
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span className={cn("font-mono text-[13px]", selected ? "text-inverse-ink" : "text-muted")}>
          ({count})
        </span>
      )}
    </button>
  );
}

export type SegmentOption<T extends string> = { value: T; label: string; count?: number };

type SegmentedFilterProps<T extends string> = {
  /** Accessible name for the group, e.g. "Visibility". */
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
};

/**
 * DESIGN.md §3 Segmented filter — a row of single-select chips ("All · Private · Public").
 * Implemented as a toolbar of toggle buttons: Tab reaches the group, ←/→ move between chips.
 */
export function SegmentedFilter<T extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
}: SegmentedFilterProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const last = options.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    refs.current[next]?.focus();
  }

  return (
    <div role="toolbar" aria-label={label} className={cn("flex flex-wrap items-center gap-2", className)}>
      {options.map((option, index) => (
        <Chip
          key={option.value}
          ref={(el) => {
            refs.current[index] = el;
          }}
          selected={option.value === value}
          count={option.count}
          tabIndex={index === selectedIndex ? 0 : -1}
          onClick={() => onValueChange(option.value)}
          onKeyDown={(e) => onKeyDown(e, index)}
        >
          {option.label}
        </Chip>
      ))}
    </div>
  );
}
