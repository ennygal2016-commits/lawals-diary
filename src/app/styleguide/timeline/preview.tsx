"use client";

import * as React from "react";

import { TimelineView } from "@/components/timeline/timeline-view";
import { CATEGORIES, MOODS } from "@/lib/moods";
import { TIMELINE_PAGE_SIZE, type TimelineFilters } from "@/lib/timeline";
import type { TimelinePage, TimelineRow } from "@/server/queries/timeline";

const TITLES = [
  "Rain on the train home",
  "Sunday pancakes, attempt three",
  "The long walk along the lake",
  "Date night at the little Thai place",
  "Mum’s sixtieth",
  "Nothing happened, and it was lovely",
  "First snow",
  "Church picnic",
  "Moving the couch, again",
  "Lagos phone call",
];

/** 75 entries over ~10 months, newest first; a stand-in for timeline_search(). */
const ALL: Array<TimelineRow & { text: string; hasPhotos: boolean }> = Array.from({ length: 75 }, (_, i) => {
  const date = new Date(Date.UTC(2026, 10, 3) - i * 4 * 86_400_000).toISOString().slice(0, 10);
  const partner = i % 2 === 0 ? "a" : "b";
  const title = `${TITLES[i % TITLES.length]}${i >= TITLES.length ? ` ${Math.floor(i / TITLES.length) + 1}` : ""}`;
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    title,
    text: `${title} ${i % 3 === 0 ? "Toronto Island" : "Union Station"}`.toLowerCase(),
    entryDate: date,
    category: CATEGORIES[i % CATEGORIES.length]!.value,
    visibility: i % 3 === 0 ? "public" : "private",
    mood: i % 4 === 3 ? null : MOODS[i % MOODS.length]!.value,
    author: partner === "a" ? { name: "Nurat", partner: "a" } : { name: "Afeez", partner: "b" },
    commentCount: i % 5,
    photoCount: i % 2,
    hasPhotos: i % 2 === 1,
    thumbUrl: null,
    monthCount: 0,
  };
});

function search(f: TimelineFilters, offset: number): TimelinePage {
  const words = f.q
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const matches = ALL.filter(
    (r) =>
      words.every((w) => r.text.split(/[^\p{L}\p{N}]+/u).some((t) => t.startsWith(w))) &&
      (f.visibility === "all" || r.visibility === f.visibility) &&
      (!f.author || r.author.partner === f.author) &&
      (!f.moods.length || (r.mood && f.moods.includes(r.mood))) &&
      (!f.categories.length || f.categories.includes(r.category)) &&
      (!f.from || r.entryDate >= f.from) &&
      (!f.to || r.entryDate <= f.to) &&
      (f.hasPhotos === null || r.hasPhotos === f.hasPhotos),
  );
  const perMonth = new Map<string, number>();
  for (const r of matches)
    perMonth.set(r.entryDate.slice(0, 7), (perMonth.get(r.entryDate.slice(0, 7)) ?? 0) + 1);
  const rows = matches
    .slice(offset, offset + TIMELINE_PAGE_SIZE)
    .map((r) => ({ ...r, monthCount: perMonth.get(r.entryDate.slice(0, 7)) ?? 0 }));
  return { rows, total: matches.length, more: matches.length > offset + TIMELINE_PAGE_SIZE };
}

export function TimelinePreview({ filters, empty }: { filters: TimelineFilters; empty: boolean }) {
  const load = React.useCallback(async (f: TimelineFilters, offset: number) => search(f, offset), []);
  const stats = empty
    ? {
        total: 0,
        byPartner: [
          { name: "Nurat", partner: "a" as const, count: 0 },
          { name: "Afeez", partner: "b" as const, count: 0 },
        ],
      }
    : {
        total: ALL.length,
        byPartner: [
          { name: "Nurat", partner: "a" as const, count: ALL.filter((r) => r.author.partner === "a").length },
          { name: "Afeez", partner: "b" as const, count: ALL.filter((r) => r.author.partner === "b").length },
        ],
      };
  return (
    <TimelineView
      filters={filters}
      firstPage={empty ? { rows: [], total: 0, more: false } : search(filters, 0)}
      stats={stats}
      load={load}
    />
  );
}
