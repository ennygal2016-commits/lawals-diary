"use client";

import * as React from "react";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { BOOK_STATUSES } from "@/lib/books";
import { PHOTO_INPUT_ACCEPT } from "@/lib/images/accept";
import { UPLOAD_BUDGET_BYTES, UPLOAD_BUDGET_LABEL, shrinkImage } from "@/lib/images/shrink";
import { cn } from "@/lib/utils";
import type { BookStatus } from "@/types/database";

export type BookFormValues = {
  title: string;
  author: string;
  isbn: string;
  status: BookStatus;
  readers: string[];
  started_on: string;
  finished_on: string;
  rating: number | null;
  notes: string;
  /** Open Library cover to download on save (only covers.openlibrary.org is accepted by the server). */
  cover_url?: string;
};

export const EMPTY_BOOK: BookFormValues = {
  title: "",
  author: "",
  isbn: "",
  status: "want_to_read",
  readers: [],
  started_on: "",
  finished_on: "",
  rating: null,
  notes: "",
};

/**
 * Book fields (PRD FR-37): title, author, ISBN, status, who is reading, dates, rating 1–5, notes, cover upload.
 * Submits a FormData so a cover file can come along.
 */
export function BookForm({
  initial,
  partners,
  submitLabel,
  coverPreview,
  onSubmit,
  pending,
}: {
  initial: BookFormValues;
  partners: Array<{ userId: string; name: string }>;
  submitLabel: string;
  coverPreview?: string | null;
  onSubmit: (data: FormData) => void;
  pending: boolean;
}) {
  const [v, setV] = React.useState(initial);
  React.useEffect(() => setV(initial), [initial]);
  const set = <K extends keyof BookFormValues>(k: K, value: BookFormValues[K]) =>
    setV((x) => ({ ...x, [k]: value }));
  const [error, setError] = React.useState<string>();
  const [coverError, setCoverError] = React.useState<string>();

  return (
    <form
      noValidate
      className="grid gap-5 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!v.title.trim()) {
          setError("Enter the title.");
          return;
        }
        setError(undefined);
        setCoverError(undefined);
        const data = new FormData(e.currentTarget);
        const cover = data.get("cover");
        if (cover instanceof File && cover.size > 0) {
          const small = await shrinkImage(cover);
          if (small.size > UPLOAD_BUDGET_BYTES) {
            setCoverError(
              `The cover is too large to upload (over ${UPLOAD_BUDGET_LABEL}). Save it as a JPEG and try again.`,
            );
            return;
          }
          data.set("cover", small);
        }
        data.delete("readers");
        for (const r of v.readers) data.append("readers", r);
        data.set("rating", v.rating ? String(v.rating) : "");
        if (v.cover_url) data.set("cover_url", v.cover_url);
        onSubmit(data);
      }}
    >
      <Field label="Title" required error={error} className="md:col-span-2">
        {(c) => (
          <Input
            {...c}
            name="title"
            value={v.title}
            maxLength={200}
            onChange={(e) => set("title", e.target.value)}
          />
        )}
      </Field>
      <Field label="Author">
        {(c) => (
          <Input
            {...c}
            name="author"
            value={v.author}
            maxLength={200}
            onChange={(e) => set("author", e.target.value)}
          />
        )}
      </Field>
      <Field label="ISBN">
        {(c) => (
          <Input
            {...c}
            name="isbn"
            value={v.isbn}
            inputMode="numeric"
            onChange={(e) => set("isbn", e.target.value)}
          />
        )}
      </Field>
      <Field label="Status">
        {(c) => (
          <select
            {...c}
            name="status"
            value={v.status}
            onChange={(e) => set("status", e.target.value as BookStatus)}
            className="h-12 w-full rounded-input border border-border bg-raised px-3 text-[15px] text-fg"
          >
            {BOOK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="eyebrow mb-2 p-0">Who is reading</legend>
        <div className="flex flex-wrap gap-4">
          {partners.map((p) => (
            <label key={p.userId} className="flex items-center gap-2 text-[15px] text-fg-soft">
              <input
                type="checkbox"
                className="size-5 accent-[var(--accent)]"
                checked={v.readers.includes(p.userId)}
                onChange={(e) =>
                  set(
                    "readers",
                    e.target.checked ? [...v.readers, p.userId] : v.readers.filter((r) => r !== p.userId),
                  )
                }
              />
              {p.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Started">
        {(c) => (
          <Input
            {...c}
            type="date"
            name="started_on"
            value={v.started_on}
            onChange={(e) => set("started_on", e.target.value)}
          />
        )}
      </Field>
      <Field label="Finished">
        {(c) => (
          <Input
            {...c}
            type="date"
            name="finished_on"
            value={v.finished_on}
            onChange={(e) => set("finished_on", e.target.value)}
          />
        )}
      </Field>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0 md:col-span-2">
        <legend className="eyebrow mb-2 p-0">Rating</legend>
        <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={v.rating === n}
              aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
              onClick={() => set("rating", v.rating === n ? null : n)}
              className="inline-flex size-10 items-center justify-center rounded-full hover:bg-raised"
            >
              <Star
                aria-hidden
                strokeWidth={1.5}
                className={cn(
                  "size-6",
                  v.rating !== null && n <= v.rating ? "fill-warning text-warning" : "text-faint",
                )}
              />
            </button>
          ))}
          <span className="ml-2 text-[13px] text-muted">{v.rating ? `${v.rating} / 5` : "No rating"}</span>
        </div>
      </fieldset>
      <Field label="Notes" className="md:col-span-2">
        {(c) => (
          <Textarea
            {...c}
            name="notes"
            rows={4}
            maxLength={5000}
            value={v.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        )}
      </Field>
      <div className="flex flex-wrap items-center gap-4 md:col-span-2">
        {coverPreview ? (
          // eslint-disable-next-line @next/next/no-img-element -- Open Library preview or signed URL
          <img src={coverPreview} alt="Cover preview" className="h-24 w-16 rounded-[6px] object-cover" />
        ) : null}
        <Field
          label={coverPreview ? "Replace cover" : "Cover (optional)"}
          hint="JPEG, PNG, WebP or HEIC."
          error={coverError}
        >
          {(c) => (
            <input
              {...c}
              type="file"
              name="cover"
              accept={PHOTO_INPUT_ACCEPT}
              className="text-[14px] text-fg-soft file:mr-3 file:h-10 file:rounded-btn file:border file:border-accent file:bg-transparent file:px-4 file:text-accent"
            />
          )}
        </Field>
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
