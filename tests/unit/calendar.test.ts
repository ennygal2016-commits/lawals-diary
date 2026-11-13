import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  dayHeading,
  dayLabel,
  endOfWeek,
  isIsoMonth,
  monthGrid,
  monthName,
  parseSpecialDates,
  shiftMonthKeepDay,
  specialDaysIn,
  startOfWeek,
  weekdayMondayFirst,
} from "@/lib/calendar";

describe("monthGrid (Monday first, PRD FR-29)", () => {
  it("November 2026 starts on a Sunday → six blanks, 5 weeks", () => {
    const weeks = monthGrid("2026-11");
    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(weeks[1]![0]).toBe("2026-11-02");
    expect(weeks.at(-1)).toEqual(["2026-11-30", null, null, null, null, null, null]);
    expect(weeks).toHaveLength(6);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it("February 2027 starts on a Monday and fits in 4 weeks", () => {
    const weeks = monthGrid("2027-02");
    expect(weeks).toHaveLength(4);
    expect(weeks[0]![0]).toBe("2027-02-01");
  });

  it("knows leap years", () => {
    expect(monthGrid("2028-02").flat().filter(Boolean)).toHaveLength(29);
  });
});

describe("date arithmetic", () => {
  it("moves across months and years", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("is safe across DST changes (calendar dates, not instants)", () => {
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });

  it("PageUp/PageDown keep the day, clamped to short months", () => {
    expect(shiftMonthKeepDay("2026-01-31", 1)).toBe("2026-02-28");
    expect(shiftMonthKeepDay("2026-03-31", -1)).toBe("2026-02-28");
    expect(shiftMonthKeepDay("2026-11-03", 12)).toBe("2027-11-03");
  });

  it("weeks run Monday to Sunday", () => {
    expect(weekdayMondayFirst("2026-11-02")).toBe(0); // Monday
    expect(weekdayMondayFirst("2026-11-01")).toBe(6); // Sunday
    expect(startOfWeek("2026-11-05")).toBe("2026-11-02");
    expect(endOfWeek("2026-11-05")).toBe("2026-11-08");
  });

  it("validates ?month=", () => {
    expect(isIsoMonth("2026-11")).toBe(true);
    expect(isIsoMonth("2026-13")).toBe(false);
    expect(isIsoMonth("26-11")).toBe(false);
    expect(isIsoMonth(null)).toBe(false);
  });
});

describe("labels", () => {
  it('reads "Tuesday 3 November" (PRD FR-30)', () => {
    expect(dayHeading("2026-11-03")).toBe("Tuesday 3 November");
    expect(dayLabel("2026-11-03")).toBe("Tuesday 3 November 2026");
    expect(monthName("2026-11")).toEqual({ name: "November", year: "2026" });
  });
});

describe("hearts: anniversary and special dates (PRD FR-31)", () => {
  it("parses special dates defensively", () => {
    expect(
      parseSpecialDates([
        { date: "1994-05-08", label: "Nurat’s birthday" },
        { date: "1990-02-30", label: "bad" },
        { date: "05-08", label: "bad" },
        { date: "1991-07-01" },
        "nope",
      ]),
    ).toEqual([
      { date: "1994-05-08", label: "Nurat’s birthday" },
      { date: "1991-07-01", label: "Special day" },
    ]);
    expect(parseSpecialDates(null)).toEqual([]);
  });

  it("marks the anniversary with its number and every yearly special date", () => {
    const specials = parseSpecialDates([
      { date: "1994-11-18", label: "Afeez’s birthday" },
      { date: "2022-11-03", label: "First trip" },
    ]);
    expect(specialDaysIn("2026-11", "2022-11-03", specials)).toEqual({
      "2026-11-03": ["4th anniversary", "First trip"],
      "2026-11-18": ["Afeez’s birthday"],
    });
    expect(specialDaysIn("2026-10", "2022-11-03", specials)).toEqual({});
  });

  it("moves 29 February to the 28th in other years and ignores years before the date", () => {
    expect(specialDaysIn("2027-02", "2024-02-29", [])).toEqual({ "2027-02-28": ["3rd anniversary"] });
    expect(specialDaysIn("2020-11", "2022-11-03", [])).toEqual({});
  });
});
