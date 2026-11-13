import { CATEGORIES, MOODS, type Category, type Mood } from "@/lib/moods";
import type { PartnerKey } from "@/lib/site";
import { isValidIsoDate } from "@/lib/iso-date";

/**
 * Timeline filters (PRD FR-19–FR-22) and their URL form, so every view can be bookmarked:
 *   ?q=lake&v=public&author=a&mood=calm,loved&category=travel&from=2026-01-01&to=2026-06-30&photos=1
 * Anything invalid in the URL is ignored rather than rejected.
 */
export type TimelineFilters = {
  q: string;
  visibility: "all" | "private" | "public";
  author: PartnerKey | null;
  moods: Mood[];
  categories: Category[];
  from: string | null;
  to: string | null;
  hasPhotos: boolean | null;
};

export const DEFAULT_FILTERS: TimelineFilters = {
  q: "",
  visibility: "all",
  author: null,
  moods: [],
  categories: [],
  from: null,
  to: null,
  hasPhotos: null,
};

export const TIMELINE_PAGE_SIZE = 30;
export const SEARCH_MAX = 200;
export const SEARCH_DEBOUNCE_MS = 300;

export const MOOD_VALUES = new Set<string>(MOODS.map((m) => m.value));
export const CATEGORY_VALUES = new Set<string>(CATEGORIES.map((c) => c.value));

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function get(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

function list<T extends string>(raw: string | undefined, allowed: Set<string>): T[] {
  if (!raw) return [];
  return [...new Set(raw.split(","))].filter((v) => allowed.has(v)) as T[];
}

export function parseTimelineParams(params: RawParams): TimelineFilters {
  const v = get(params, "v");
  const author = get(params, "author");
  const from = get(params, "from");
  const to = get(params, "to");
  const photos = get(params, "photos");
  const parsedFrom = from && isValidIsoDate(from) ? from : null;
  const parsedTo = to && isValidIsoDate(to) ? to : null;
  return {
    q: (get(params, "q") ?? "").slice(0, SEARCH_MAX),
    visibility: v === "private" || v === "public" ? v : "all",
    author: author === "a" || author === "b" ? author : null,
    moods: list<Mood>(get(params, "mood"), MOOD_VALUES),
    categories: list<Category>(get(params, "category"), CATEGORY_VALUES),
    // A reversed range is swapped rather than returning nothing.
    from: parsedFrom && parsedTo && parsedFrom > parsedTo ? parsedTo : parsedFrom,
    to: parsedFrom && parsedTo && parsedFrom > parsedTo ? parsedFrom : parsedTo,
    hasPhotos: photos === "1" ? true : photos === "0" ? false : null,
  };
}

/** Only non-default values go in the URL, in a stable order. */
export function timelineQueryString(f: TimelineFilters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.visibility !== "all") p.set("v", f.visibility);
  if (f.author) p.set("author", f.author);
  if (f.moods.length) p.set("mood", f.moods.join(","));
  if (f.categories.length) p.set("category", f.categories.join(","));
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.hasPhotos !== null) p.set("photos", f.hasPhotos ? "1" : "0");
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** How many "More filters" are set (author, mood, category, date range, photos). */
export function activeMoreFilters(f: TimelineFilters): number {
  return (
    (f.author ? 1 : 0) +
    (f.moods.length ? 1 : 0) +
    (f.categories.length ? 1 : 0) +
    (f.from || f.to ? 1 : 0) +
    (f.hasPhotos !== null ? 1 : 0)
  );
}

export function isFiltered(f: TimelineFilters): boolean {
  return Boolean(f.q.trim()) || f.visibility !== "all" || activeMoreFilters(f) > 0;
}

export type MonthGroup<T> = { key: string; label: string; count: number; rows: T[] };

/**
 * Rows arrive newest first; consecutive rows of the same month form a group. `count` is the month's total for the
 * current filters (from the database), not just the rows loaded so far.
 */
export function groupByMonth<T extends { entryDate: string; monthCount: number }>(
  rows: T[],
): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  for (const row of rows) {
    const key = row.entryDate.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.rows.push(row);
      continue;
    }
    const [y, m] = key.split("-").map(Number) as [number, number];
    const label = new Intl.DateTimeFormat("en-CA", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(y, m - 1, 1)));
    groups.push({ key, label, count: row.monthCount, rows: [row] });
  }
  return groups;
}

/** Timeline row day: "Tue 3". */
export function timelineDay(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  const weekday = new Intl.DateTimeFormat("en-CA", { weekday: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
  return `${weekday.replace(".", "")} ${d}`;
}
