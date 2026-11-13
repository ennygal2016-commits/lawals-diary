"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/** On/off switch (WAI-ARIA switch pattern). The visible label is the accessible name. */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: React.ReactNode;
  disabled?: boolean;
}) {
  const id = React.useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-[15px] text-fg">
          {label}
        </label>
        {description ? (
          <p id={`${id}-desc`} className="m-0 text-[13px] text-muted">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50",
          checked ? "border-accent bg-accent" : "border-border-strong bg-raised",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block size-5 rounded-full transition-transform",
            checked ? "translate-x-[22px] bg-accent-ink" : "translate-x-[3px] bg-fg-soft",
          )}
        />
      </button>
    </div>
  );
}
