"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/** DESIGN.md §3 Input — 48px, raised fill, 1px border, 10px radius. */
export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-input border border-border bg-raised px-3 text-[15px] text-fg",
        "transition-colors hover:border-border-strong",
        "aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:opacity-50",
        "file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-fg",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The entry Title field: borderless with an underline, 34px Instrument Serif,
 * italic serif placeholder "Give the day a name" (large text, so --subtle passes AA).
 */
export function TitleInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="text"
      data-slot="title-input"
      className={cn(
        "serif w-full min-w-0 border-0 border-b border-border-strong bg-transparent pt-1.5 pb-3 text-[34px] leading-tight text-fg",
        "placeholder:text-subtle placeholder:italic",
        "focus-visible:border-accent focus-visible:outline-none",
        "aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  );
}

type TextareaProps = React.ComponentProps<"textarea"> & {
  /** Show a "n / max" counter under the field. Requires maxLength. */
  showCount?: boolean;
};

/** DESIGN.md §3 Textarea — page-coloured well inside a card, 12px radius, optional counter. */
export function Textarea({ className, showCount = false, maxLength, onChange, id, ...props }: TextareaProps) {
  const autoId = React.useId();
  const fieldId = id ?? autoId;
  const counterId = `${fieldId}-count`;
  const initial = String(props.value ?? props.defaultValue ?? "").length;
  const [length, setLength] = React.useState(initial);
  const current = props.value !== undefined ? String(props.value).length : length;

  const describedBy = [props["aria-describedby"], showCount ? counterId : null].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-2">
      <textarea
        id={fieldId}
        data-slot="textarea"
        maxLength={maxLength}
        onChange={(event) => {
          setLength(event.target.value.length);
          onChange?.(event);
        }}
        className={cn(
          "min-h-28 w-full resize-y rounded-btn border border-border bg-bg px-4 py-3.5 text-base leading-normal text-fg",
          "transition-colors hover:border-border-strong aria-[invalid=true]:border-danger",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
        aria-describedby={describedBy || undefined}
      />
      {showCount && maxLength ? (
        <span id={counterId} className="font-mono text-[13px] text-faint">
          {current} / {maxLength}
        </span>
      ) : null}
    </div>
  );
}

type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  required?: boolean;
};

type FieldProps = {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  /** Receives the id / aria props to spread onto the control. */
  children: (control: ControlProps) => React.ReactNode;
};

/**
 * Label + control + hint + error, wired for screen readers (WCAG 1.3.1, 3.3.1, 3.3.2).
 * Labels use the mono eyebrow style from the Nocturne forms.
 */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = React.useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
        {required ? (
          <span aria-hidden className="text-accent">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        required,
      })}
      {hint ? (
        <p id={hintId} className="text-[13px] text-faint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
