import { type IsoDate, type IsoMonth, parseSpecialDates, specialDaysIn } from "@/lib/calendar";
import type { CalendarMonth, DayEntry } from "@/server/queries/calendar";

/** Sample data for the /styleguide/calendar preview (no database). */
const ENTRIES: Record<IsoDate, DayEntry[]> = {
  "2026-11-01": [
    {
      id: "s1",
      title: "Sunday pancakes, attempt three",
      category: "food",
      mood: "funny",
      visibility: "private",
      author: { name: "Afeez", partner: "b" },
      thumbUrl: null,
    },
  ],
  "2026-11-03": [
    {
      id: "s2",
      title: "Rain on the train home",
      category: "everyday",
      mood: "calm",
      visibility: "private",
      author: { name: "Nurat", partner: "a" },
      thumbUrl: null,
    },
  ],
  "2026-10-31": [
    {
      id: "s3",
      title: "The long walk along the lake",
      category: "date_night",
      mood: "loved",
      visibility: "public",
      author: { name: "Nurat", partner: "a" },
      thumbUrl: null,
    },
  ],
  "2026-10-24": [
    {
      id: "s4",
      title: "Mum’s sixtieth",
      category: "family",
      mood: "happy",
      visibility: "public",
      author: { name: "Nurat", partner: "a" },
      thumbUrl: null,
    },
    {
      id: "s5",
      title: "Speech practice",
      category: "family",
      mood: null,
      visibility: "private",
      author: { name: "Afeez", partner: "b" },
      thumbUrl: null,
    },
  ],
  "2026-12-24": [
    {
      id: "s6",
      title: "Christmas Eve lights",
      category: "date_night",
      mood: "excited",
      visibility: "private",
      author: { name: "Afeez", partner: "b" },
      thumbUrl: null,
    },
  ],
};

const SPECIALS = parseSpecialDates([
  { date: "1994-11-18", label: "Afeez’s birthday" },
  { date: "1995-12-02", label: "Nurat’s birthday" },
]);
const ANNIVERSARY = "2022-10-15";

export function sampleDayEntries(date: IsoDate | null): DayEntry[] {
  return date ? (ENTRIES[date] ?? []) : [];
}

export function sampleMonth(month: IsoMonth): CalendarMonth {
  const entries: Record<IsoDate, number> = {};
  for (const [date, list] of Object.entries(ENTRIES)) if (date.startsWith(month)) entries[date] = list.length;
  return { month, entries, special: specialDaysIn(month, ANNIVERSARY, SPECIALS) };
}
