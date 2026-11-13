import { formatInTimeZone } from "date-fns-tz";

import { SHARED_TIMEZONE } from "@/lib/site";
import type { DailyKind } from "@/types/database";

export type DailyItem = {
  id: string;
  kind: DailyKind;
  text: string;
  attribution: string | null;
  reference: string | null;
  translation: string | null;
  active: boolean;
};

/** DESIGN.md §7: the epoch the daily pick counts from. */
const EPOCH_UTC = Date.UTC(2020, 0, 1);
const DAY_MS = 86_400_000;

/**
 * Each kind starts at a different place in its list, so two libraries of the same length don't move in lockstep
 * (item 3 of every list on the same day).
 */
export const KIND_OFFSET: Record<DailyKind, number> = {
  scripture: 0,
  romance: 7,
  love: 13,
  faith: 19,
  encouragement: 29,
};

/** Whole calendar days from 2020-01-01 to `date`, counted in `timeZone` (DST-safe: works on the calendar date). */
export function daysSinceEpoch(date: Date, timeZone: string = SHARED_TIMEZONE): number {
  const [y, m, d] = formatInTimeZone(date, timeZone, "yyyy-MM-dd").split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH_UTC) / DAY_MS);
}

/**
 * The item for `kind` on `date`: content[(days since 2020-01-01 + kind offset) mod count] over the ACTIVE items of
 * that kind, ordered by id. The calendar date is taken in the shared time zone, so both partners see the same item
 * wherever they are. Pure: no I/O, no clock.
 */
export function pickDaily<T extends Pick<DailyItem, "id" | "kind" | "active">>(
  kind: DailyKind,
  date: Date,
  items: readonly T[],
  timeZone: string = SHARED_TIMEZONE,
): T | null {
  const pool = items
    .filter((item) => item.kind === kind && item.active)
    // Code-unit order, not localeCompare — must match Postgres `order by id` on uuids and never vary by locale.
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (pool.length === 0) return null;
  const index =
    (((daysSinceEpoch(date, timeZone) + KIND_OFFSET[kind]) % pool.length) + pool.length) % pool.length;
  return pool[index] ?? null;
}

/** Licence line under the scripture card (PRD FR-6). */
export const TRANSLATION_NOTICES: Record<string, { name: string; notice: string }> = {
  KJV: { name: "King James Version", notice: "King James Version — public domain." },
};

export function translationNotice(code: string | null): string | undefined {
  return code ? TRANSLATION_NOTICES[code]?.notice : undefined;
}

/** What the daily card shows under the text, and whether the text is a quotation. */
export function dailyPresentation(
  item: Pick<DailyItem, "kind" | "attribution" | "reference" | "translation">,
): {
  attribution: string;
  isQuote: boolean;
} {
  const cited = item.reference ? [item.reference, item.translation].filter(Boolean).join(" · ") : null;
  switch (item.kind) {
    case "scripture":
      return { attribution: cited ?? item.attribution ?? "", isQuote: true };
    case "romance":
      return { attribution: item.attribution ?? "", isQuote: true };
    case "faith":
      return cited
        ? { attribution: cited, isQuote: true }
        : { attribution: item.attribution ?? "From your library", isQuote: false };
    case "love":
      return { attribution: item.attribution ?? "A small prompt", isQuote: false };
    case "encouragement":
      return { attribution: item.attribution ?? "From your library", isQuote: false };
  }
}
