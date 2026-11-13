import { describe, expect, it } from "vitest";

import { KIND_OFFSET, dailyPresentation, daysSinceEpoch, pickDaily, translationNotice } from "@/lib/daily";
import { entryDay, greetingFor, homeDate, noteStamp, shortHomeDate, togetherStats } from "@/lib/dates";
import type { DailyKind } from "@/types/database";

const TORONTO = "America/Toronto";

function items(kind: DailyKind, n: number, extra: Partial<{ active: boolean }> = {}) {
  // Deliberately out of id order, to prove the function sorts.
  return Array.from({ length: n }, (_, i) => ({
    id: `00000000-0000-0000-0000-${String(n - 1 - i).padStart(12, "0")}`,
    kind,
    active: true,
    ...extra,
  }));
}
const byId = <T extends { id: string }>(list: T[]) => [...list].sort((a, b) => (a.id < b.id ? -1 : 1));

describe("daysSinceEpoch", () => {
  it("is 0 on 2020-01-01 in the shared time zone", () => {
    expect(daysSinceEpoch(new Date("2020-01-01T12:00:00-05:00"), TORONTO)).toBe(0);
  });

  it("uses the Toronto calendar day, not UTC", () => {
    // 23:30 in Toronto on 1 Jan 2020 is already 2 Jan in UTC.
    expect(daysSinceEpoch(new Date("2020-01-02T04:30:00Z"), TORONTO)).toBe(0);
    expect(daysSinceEpoch(new Date("2020-01-02T04:30:00Z"), "UTC")).toBe(1);
  });

  it("counts calendar days across DST changes", () => {
    // Toronto springs forward on 8 March 2026 and falls back on 1 November 2026.
    const before = daysSinceEpoch(new Date("2026-03-07T12:00:00-05:00"), TORONTO);
    expect(daysSinceEpoch(new Date("2026-03-09T12:00:00-04:00"), TORONTO)).toBe(before + 2);
    const nov = daysSinceEpoch(new Date("2026-10-31T23:59:00-04:00"), TORONTO);
    expect(daysSinceEpoch(new Date("2026-11-01T23:59:00-05:00"), TORONTO)).toBe(nov + 1);
  });
});

describe("pickDaily", () => {
  const scripture = items("scripture", 5);
  const sorted = byId(scripture);

  it("returns content[(days + offset) mod count] over items ordered by id", () => {
    const date = new Date("2026-11-03T15:00:00-05:00");
    const expected = sorted[(daysSinceEpoch(date, TORONTO) + KIND_OFFSET.scripture) % 5];
    expect(pickDaily("scripture", date, scripture, TORONTO)).toBe(expected);
  });

  it("is the same all day long in Toronto and changes at Toronto midnight", () => {
    const morning = pickDaily("scripture", new Date("2026-11-03T00:01:00-05:00"), scripture, TORONTO);
    const night = pickDaily("scripture", new Date("2026-11-03T23:59:00-05:00"), scripture, TORONTO);
    const next = pickDaily("scripture", new Date("2026-11-04T00:01:00-05:00"), scripture, TORONTO);
    expect(night).toBe(morning);
    expect(next).not.toBe(morning);
  });

  it("gives both partners the same item for the same instant, wherever they are", () => {
    // The instant is what matters; the shared zone decides the day.
    const instant = new Date("2026-11-04T02:00:00Z"); // 21:00 in Toronto on 3 Nov, 03:00 in Lagos on 4 Nov
    expect(pickDaily("scripture", instant, scripture)).toBe(
      pickDaily("scripture", new Date("2026-11-03T21:00:00-05:00"), scripture),
    );
  });

  it("walks through every item in order, one per day", () => {
    const start = new Date("2026-01-10T12:00:00-05:00");
    const seen = Array.from({ length: 5 }, (_, i) =>
      pickDaily("scripture", new Date(start.getTime() + i * 86_400_000), scripture, TORONTO),
    );
    expect(new Set(seen).size).toBe(5);
    const first = sorted.indexOf(seen[0]!);
    seen.forEach((item, i) => expect(item).toBe(sorted[(first + i) % 5]));
  });

  it("ignores other kinds and inactive items", () => {
    const mixed = [
      ...items("love", 3),
      ...items("scripture", 2),
      { ...items("scripture", 1)[0]!, id: "z", active: false },
    ];
    for (let i = 0; i < 10; i++) {
      const picked = pickDaily("scripture", new Date(Date.UTC(2026, 0, 1 + i, 17)), mixed, TORONTO);
      expect(picked?.kind).toBe("scripture");
      expect(picked?.active).toBe(true);
    }
  });

  it("returns null when there is nothing to show", () => {
    expect(pickDaily("faith", new Date(), [], TORONTO)).toBeNull();
    expect(pickDaily("faith", new Date(), items("faith", 3, { active: false }), TORONTO)).toBeNull();
  });

  it("does not mutate its input and works before the epoch", () => {
    const copy = [...scripture];
    expect(pickDaily("scripture", new Date("2019-06-01T12:00:00Z"), scripture, TORONTO)).not.toBeNull();
    expect(scripture).toEqual(copy);
  });

  it("different kinds don't move in lockstep", () => {
    const date = new Date("2026-11-03T12:00:00-05:00");
    const a = pickDaily("romance", date, items("romance", 30), TORONTO)!.id;
    const b = pickDaily("love", date, items("love", 30), TORONTO)!.id;
    expect(a).not.toBe(b); // same ids in both lists, so equal ids would mean the same position
  });
});

describe("dailyPresentation", () => {
  it("cites scripture as reference · translation, quoted", () => {
    expect(
      dailyPresentation({
        kind: "scripture",
        reference: "Song of Solomon 8:7",
        translation: "KJV",
        attribution: null,
      }),
    ).toEqual({ attribution: "Song of Solomon 8:7 · KJV", isQuote: true });
    expect(translationNotice("KJV")).toBe("King James Version — public domain.");
  });

  it("labels prompts and original lines", () => {
    expect(
      dailyPresentation({ kind: "love", reference: null, translation: null, attribution: null }),
    ).toEqual({
      attribution: "A small prompt",
      isQuote: false,
    });
    expect(
      dailyPresentation({ kind: "encouragement", reference: null, translation: null, attribution: null })
        .attribution,
    ).toBe("From your library");
  });
});

describe("home dates", () => {
  it('formats the date as "Tuesday 3 November"', () => {
    const date = new Date("2026-11-03T15:00:00-05:00");
    expect(homeDate(date, TORONTO)).toBe("Tuesday 3 November");
    expect(shortHomeDate(date, TORONTO)).toBe("Tue 3 Nov");
  });

  it.each([
    ["2026-11-03T05:00:00-05:00", "Good morning"],
    ["2026-11-03T11:59:00-05:00", "Good morning"],
    ["2026-11-03T12:00:00-05:00", "Good afternoon"],
    ["2026-11-03T16:59:00-05:00", "Good afternoon"],
    ["2026-11-03T17:00:00-05:00", "Good evening"],
    ["2026-11-03T23:59:00-05:00", "Good evening"],
    ["2026-11-03T00:30:00-05:00", "Good morning"],
  ])("%s in Toronto → %s", (iso, greeting) => {
    expect(greetingFor(new Date(iso), TORONTO)).toBe(greeting);
  });

  it("uses each viewer's own time zone", () => {
    const instant = new Date("2026-11-03T15:00:00Z"); // 10:00 Toronto, 16:00 Lagos
    expect(greetingFor(instant, TORONTO)).toBe("Good morning");
    expect(greetingFor(instant, "Africa/Lagos")).toBe("Good afternoon");
  });

  it("stamps notes relative to today", () => {
    const now = new Date("2026-11-03T15:00:00-05:00");
    expect(noteStamp(new Date("2026-11-03T10:04:00-05:00"), now, TORONTO)).toBe("Today · 10:04");
    expect(noteStamp(new Date("2026-11-02T21:30:00-05:00"), now, TORONTO)).toBe("Yesterday · 21:30");
    expect(noteStamp(new Date("2026-10-27T08:05:00-04:00"), now, TORONTO)).toBe("Tue 27 Oct · 08:05");
    expect(noteStamp(new Date("2025-12-25T08:05:00-05:00"), now, TORONTO)).toBe("25 Dec 2025 · 08:05");
  });

  it("formats entry days without shifting them", () => {
    expect(entryDay("2026-11-03")).toBe("Tue 03 Nov");
    expect(entryDay("2026-01-01")).toBe("Thu 01 Jan");
  });
});

describe("togetherStats", () => {
  it("counts days together and the next anniversary", () => {
    const s = togetherStats("2023-05-08", "2026-11-03");
    expect(s.days).toBe(1275);
    expect(s.next).toBe("4th anniversary in 186 days");
    expect(s.isAnniversary).toBe(false);
  });

  it("celebrates on the day", () => {
    const s = togetherStats("2022-11-03", "2026-11-03");
    expect(s.next).toBe("Happy 4th anniversary");
    expect(s.isAnniversary).toBe(true);
  });

  it("handles 1 day, teens ordinals and 29 February", () => {
    expect(togetherStats("2025-11-04", "2026-11-03").next).toBe("1st anniversary in 1 day");
    expect(togetherStats("2015-11-04", "2026-11-03").next).toBe("11th anniversary in 1 day");
    expect(togetherStats("2024-02-29", "2026-02-28").isAnniversary).toBe(true);
  });

  it("never shows negative days for a future date", () => {
    const s = togetherStats("2027-01-01", "2026-11-03");
    expect(s.days).toBe(0);
    expect(s.next).toBe("");
  });
});
