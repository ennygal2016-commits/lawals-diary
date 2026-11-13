"use client";

import { CheckCircle2, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UploadItem } from "./use-photo-uploads";

function sizeLabel(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const STATUS: Record<UploadItem["status"], string> = {
  queued: "Waiting",
  uploading: "Uploading",
  processing: "Removing location data…",
  done: "Done",
  error: "Failed",
};

/** Per-file progress list (PRD FR-23). Each row has a labelled progress bar. */
export function UploadQueue({
  items,
  onDismiss,
  onClear,
}: {
  items: UploadItem[];
  onDismiss: (key: string) => void;
  onClear?: () => void;
}) {
  if (items.length === 0) return null;
  const finished = items.filter((i) => i.status === "done" || i.status === "error").length;

  return (
    <section aria-label="Uploads" className="rounded-card border border-border bg-surface p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="eyebrow m-0">
          Uploads · {finished} / {items.length}
        </h2>
        {onClear && finished > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="text-[13px] text-fg-soft underline underline-offset-2"
          >
            Clear finished
          </button>
        ) : null}
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center" aria-hidden>
              {item.status === "done" ? (
                <CheckCircle2 className="size-5 text-success" strokeWidth={1.75} />
              ) : item.status === "error" ? (
                <X className="size-5 text-danger" strokeWidth={2} />
              ) : (
                <Loader2 className="size-5 animate-spin text-muted" />
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="truncate text-fg">{item.name}</span>
                <span
                  className={cn(
                    "shrink-0 font-mono text-[12px]",
                    item.status === "error" ? "text-danger" : "text-muted",
                  )}
                >
                  {item.status === "error"
                    ? item.message
                    : item.status === "uploading"
                      ? `${item.progress}% · ${sizeLabel(item.size)}`
                      : STATUS[item.status]}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`${item.name}: ${STATUS[item.status]}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={item.status === "done" ? 100 : item.progress}
                className="h-1 overflow-hidden rounded-full bg-raised"
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    item.status === "error"
                      ? "bg-danger"
                      : item.status === "done"
                        ? "bg-success"
                        : "bg-accent",
                    item.status === "processing" && "animate-pulse",
                  )}
                  style={{ width: `${item.status === "error" ? 100 : item.progress}%` }}
                />
              </div>
            </div>
            {item.status === "done" || item.status === "error" ? (
              <button
                type="button"
                aria-label={`Dismiss ${item.name}`}
                onClick={() => onDismiss(item.key)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-fg"
              >
                <X aria-hidden className="size-4" strokeWidth={1.75} />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
