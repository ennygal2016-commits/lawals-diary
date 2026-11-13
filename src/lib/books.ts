import { z } from "zod";

import { isValidIsoDate } from "@/lib/validation/entry";
import type { BookStatus } from "@/types/database";

/** Bookshelf (PRD FR-37/38). Pure helpers shared by the browser and the server. */

export const BOOK_STATUSES: Array<{ value: BookStatus; label: string }> = [
  { value: "reading", label: "Reading" },
  { value: "want_to_read", label: "Want to read" },
  { value: "finished", label: "Finished" },
];
export const bookStatusLabel = (s: BookStatus) => BOOK_STATUSES.find((x) => x.value === s)?.label ?? s;

/** Strip spaces and hyphens; uppercase a trailing x. Returns null unless it is a valid ISBN-10 or ISBN-13. */
export function normalizeIsbn(raw: string): string | null {
  const s = raw.replace(/[\s-]/g, "").toUpperCase();
  if (/^\d{9}[\dX]$/.test(s)) {
    const sum = [...s].reduce((acc, ch, i) => acc + (ch === "X" ? 10 : Number(ch)) * (10 - i), 0);
    return sum % 11 === 0 ? s : null;
  }
  if (/^\d{13}$/.test(s)) {
    const sum = [...s.slice(0, 12)].reduce((acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 1 : 3), 0);
    return (10 - (sum % 10)) % 10 === Number(s[12]) ? s : null;
  }
  return null;
}

export type OpenLibraryBook = {
  title: string;
  author: string | null;
  coverUrl: string | null;
  published: string | null;
};

/**
 * Parse https://openlibrary.org/api/books?bibkeys=ISBN:…&format=json&jscmd=data. Returns null when the ISBN isn't
 * known. Only covers.openlibrary.org cover URLs are kept (the server later downloads from that host only).
 */
export function parseOpenLibrary(json: unknown, isbn: string): OpenLibraryBook | null {
  if (!json || typeof json !== "object") return null;
  const rec = (json as Record<string, unknown>)[`ISBN:${isbn}`];
  if (!rec || typeof rec !== "object") return null;
  const r = rec as Record<string, unknown>;
  const title = typeof r.title === "string" ? r.title.trim().slice(0, 200) : "";
  if (!title) return null;
  const authors = Array.isArray(r.authors)
    ? r.authors
        .map((a) => (a && typeof a === "object" ? (a as Record<string, unknown>).name : null))
        .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
    : [];
  const cover = r.cover && typeof r.cover === "object" ? (r.cover as Record<string, unknown>) : {};
  const coverUrl = [cover.large, cover.medium].find(
    (u): u is string => typeof u === "string" && isOpenLibraryCover(u),
  );
  return {
    title,
    author: authors.length ? authors.join(", ").slice(0, 200) : null,
    coverUrl: coverUrl ?? null,
    published: typeof r.publish_date === "string" ? r.publish_date.slice(0, 40) : null,
  };
}

export function isOpenLibraryCover(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "covers.openlibrary.org";
  } catch {
    return false;
  }
}

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || isValidIsoDate(v), { error: "Choose a date." });

export const bookSchema = z
  .object({
    title: z.string().trim().min(1, { error: "Enter the title." }).max(200),
    author: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => v || null),
    isbn: z
      .string()
      .optional()
      .transform((v) => (v && v.trim() ? v : null))
      .refine((v) => v === null || normalizeIsbn(v) !== null, { error: "That ISBN doesn’t look right." })
      .transform((v) => (v === null ? null : normalizeIsbn(v))),
    status: z.enum(["want_to_read", "reading", "finished"]),
    readers: z.array(z.uuid()).max(2),
    started_on: optionalDate,
    finished_on: optionalDate,
    rating: z.coerce
      .number()
      .int()
      .min(1)
      .max(5)
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    notes: z
      .string()
      .max(5000, { error: "Keep notes to 5,000 characters." })
      .optional()
      .transform((v) => (v && v.trim() ? v.trim() : null)),
  })
  .refine((b) => !b.started_on || !b.finished_on || b.started_on <= b.finished_on, {
    path: ["finished_on"],
    error: "Finished before it started?",
  });
export type BookInput = z.input<typeof bookSchema>;

export const quoteSchema = z.object({
  bookId: z.uuid(),
  text: z.string().trim().min(1, { error: "Write the quote." }).max(2000),
  page: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => v || null),
});
