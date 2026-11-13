import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_FILTERS,
  activeMoreFilters,
  groupByMonth,
  isFiltered,
  parseTimelineParams,
  timelineDay,
  timelineQueryString,
} from "@/lib/timeline";
import { timelineFiltersSchema } from "@/lib/validation/timeline";

describe("timeline filters in the URL (FR-22)", () => {
  it("round-trips every filter", () => {
    const qs =
      "?q=lake+walk&v=public&author=a&mood=calm,loved&category=travel,food&from=2026-01-01&to=2026-06-30&photos=1";
    const f = parseTimelineParams(new URLSearchParams(qs));
    expect(f).toEqual({
      q: "lake walk",
      visibility: "public",
      author: "a",
      moods: ["calm", "loved"],
      categories: ["travel", "food"],
      from: "2026-01-01",
      to: "2026-06-30",
      hasPhotos: true,
    });
    expect(parseTimelineParams(new URLSearchParams(timelineQueryString(f)))).toEqual(f);
  });

  it("defaults to everything and an empty query string", () => {
    expect(parseTimelineParams({})).toEqual(DEFAULT_FILTERS);
    expect(timelineQueryString(DEFAULT_FILTERS)).toBe("");
    expect(isFiltered(DEFAULT_FILTERS)).toBe(false);
  });

  it("ignores junk instead of failing", () => {
    const f = parseTimelineParams({
      v: "secret",
      author: "c",
      mood: "angry,calm,calm",
      category: "work",
      from: "2026-02-30",
      to: "tomorrow",
      photos: "yes",
    });
    expect(f).toEqual({ ...DEFAULT_FILTERS, moods: ["calm"] });
  });

  it("swaps a reversed date range, caps the search length, reads arrays from Next params", () => {
    expect(parseTimelineParams({ from: "2026-06-01", to: "2026-01-01" })).toMatchObject({
      from: "2026-01-01",
      to: "2026-06-01",
    });
    expect(parseTimelineParams({ q: "x".repeat(500) }).q).toHaveLength(200);
    expect(parseTimelineParams({ v: ["public", "private"] }).visibility).toBe("public");
    expect(parseTimelineParams({ photos: "0" }).hasPhotos).toBe(false);
  });

  it("counts the More filters that are on", () => {
    expect(activeMoreFilters({ ...DEFAULT_FILTERS, author: "b", to: "2026-01-01", hasPhotos: false })).toBe(
      3,
    );
    expect(activeMoreFilters({ ...DEFAULT_FILTERS, q: "x", visibility: "private" })).toBe(0);
  });

  it("the server schema accepts parsed filters and rejects tampering", () => {
    const f = parseTimelineParams({ mood: "calm", from: "2026-01-01" });
    expect(timelineFiltersSchema.safeParse(f).success).toBe(true);
    expect(timelineFiltersSchema.safeParse({ ...f, moods: ["calm'; drop table"] }).success).toBe(false);
    expect(timelineFiltersSchema.safeParse({ ...f, q: "x".repeat(201) }).success).toBe(false);
  });
});

describe("groupByMonth (FR-21)", () => {
  const row = (entryDate: string, monthCount: number) => ({ entryDate, monthCount });

  it("groups newest-first rows by month with the database's month total", () => {
    const groups = groupByMonth([
      row("2026-11-03", 2),
      row("2026-11-01", 2),
      row("2026-10-31", 14),
      row("2026-10-24", 14),
    ]);
    expect(groups.map((g) => [g.label, g.count, g.rows.length])).toEqual([
      ["November 2026", 2, 2],
      ["October 2026", 14, 2],
    ]);
  });

  it("keeps the same month together across pages", () => {
    const page1 = [row("2026-10-31", 3), row("2026-10-29", 3)];
    const page2 = [row("2026-10-24", 3), row("2026-09-01", 1)];
    const groups = groupByMonth([...page1, ...page2]);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.rows).toHaveLength(3);
  });
});

describe("timelineDay", () => {
  it('formats as "Tue 3"', () => {
    expect(timelineDay("2026-11-03")).toBe("Tue 3");
    expect(timelineDay("2026-10-31")).toBe("Sat 31");
  });
});

describe("timeline_search migration", () => {
  const sql = readFileSync("supabase/migrations/20261111000006_timeline_search.sql", "utf8");
  it("only builds tsqueries from letters and digits, and is not callable by anon", () => {
    expect(sql).toContain("regexp_split_to_table(lower(left(coalesce(p_query, ''), 200)), '[^[:alnum:]]+')");
    expect(sql).toMatch(/revoke execute on function public\.timeline_search\([\s\S]*?\) from public, anon;/);
    expect(sql).not.toMatch(/security definer/i);
  });
});
