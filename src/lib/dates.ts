import { formatInTimeZone } from "date-fns-tz";

export type Greeting = "Good morning" | "Good afternoon" | "Good evening";

/** PRD FR-5: morning before 12:00, afternoon before 17:00, evening after — in the viewer's own time zone. */
export function greetingFor(date: Date, timeZone: string): Greeting {
  const hour = Number(formatInTimeZone(date, timeZone, "H"));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** "Tuesday 3 November" (PRD FR-5). */
export function homeDate(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "EEEE d MMMM");
}

/** Phone eyebrow: "Tue 3 Nov". */
export function shortHomeDate(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "EEE d MMM");
}

export function calendarDate(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd");
}

/** Note timestamps (24-hour, like Nocturne): "Today · 10:04", "Yesterday · 21:30", "Tue 3 Nov · 10:04". */
export function noteStamp(at: Date, now: Date, timeZone: string): string {
  const time = formatInTimeZone(at, timeZone, "HH:mm");
  const day = calendarDate(at, timeZone);
  if (day === calendarDate(now, timeZone)) return `Today · ${time}`;
  if (day === calendarDate(new Date(now.getTime() - 86_400_000), timeZone)) return `Yesterday · ${time}`;
  const sameYear = day.slice(0, 4) === calendarDate(now, timeZone).slice(0, 4);
  return `${formatInTimeZone(at, timeZone, sameYear ? "EEE d MMM" : "d MMM yyyy")} · ${time}`;
}

/** Entry cards: a `date` column ("2026-11-03") as "Tue 03 Nov". No time zone involved — it is already a day. */
export function entryDay(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return formatInTimeZone(date, "UTC", "EEE dd MMM");
}

/** Entry page eyebrow: "Tuesday 3 November 2026". */
export function entryLongDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  return formatInTimeZone(new Date(Date.UTC(y, m - 1, d)), "UTC", "EEEE d MMMM yyyy");
}

function utcDay(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

/**
 * Days-together ring (PRD FR-12). `anniversary` and `today` are calendar dates ("yyyy-MM-dd").
 * A 29 February anniversary is celebrated on 28 February in other years.
 */
export function togetherStats(anniversary: string, today: string) {
  const days = Math.round((utcDay(today) - utcDay(anniversary)) / 86_400_000);
  const [ay, am, ad] = anniversary.split("-").map(Number) as [number, number, number];
  const [ty] = today.split("-").map(Number) as [number];

  const occurrence = (year: number) => {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const day = am === 2 && ad === 29 && !isLeap ? 28 : ad;
    return Date.UTC(year, am - 1, day);
  };
  let year = ty;
  if (occurrence(year) < utcDay(today)) year += 1;
  const daysUntil = Math.round((occurrence(year) - utcDay(today)) / 86_400_000);
  const number = year - ay;

  let next: string;
  if (number <= 0) next = "";
  else if (daysUntil === 0) next = `Happy ${ordinal(number)} anniversary`;
  else next = `${ordinal(number)} anniversary in ${daysUntil} ${daysUntil === 1 ? "day" : "days"}`;

  /** Share of the current year that has passed — drives the ring. */
  const yearLength = Math.round((occurrence(year) - occurrence(year - 1)) / 86_400_000);
  const progress = days < 0 ? 0 : 1 - daysUntil / yearLength;

  return { days: Math.max(0, days), next, progress, isAnniversary: daysUntil === 0 && number > 0 };
}
