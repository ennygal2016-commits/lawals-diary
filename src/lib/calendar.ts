/**
 * Calendar maths (PRD FR-29–FR-31). Pure and time-zone free: everything works on calendar dates ("yyyy-mm-dd")
 * and months ("yyyy-mm"), computed in UTC so no DST or local-zone shift can move a day.
 */

export type IsoDate = string; // "2026-11-03"
export type IsoMonth = string; // "2026-11"

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

function utc(date: IsoDate): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function iso(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function isIsoMonth(value: string | undefined | null): value is IsoMonth {
  if (!value || !MONTH_RE.test(value)) return false;
  const year = Number(value.slice(0, 4));
  return year >= 1900 && year <= 2999;
}

export function monthOf(date: IsoDate): IsoMonth {
  return date.slice(0, 7);
}

export function daysInMonth(month: IsoMonth): number {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addMonths(month: IsoMonth, delta: number): IsoMonth {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return iso(d).slice(0, 7);
}

export function addDays(date: IsoDate, delta: number): IsoDate {
  const d = utc(date);
  d.setUTCDate(d.getUTCDate() + delta);
  return iso(d);
}

/** Same day number in another month, clamped (31 Jan → 28/29 Feb). */
export function shiftMonthKeepDay(date: IsoDate, delta: number): IsoDate {
  const month = addMonths(monthOf(date), delta);
  const day = Math.min(Number(date.slice(8, 10)), daysInMonth(month));
  return `${month}-${String(day).padStart(2, "0")}`;
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayMondayFirst(date: IsoDate): number {
  return (utc(date).getUTCDay() + 6) % 7;
}

export function startOfWeek(date: IsoDate): IsoDate {
  return addDays(date, -weekdayMondayFirst(date));
}

export function endOfWeek(date: IsoDate): IsoDate {
  return addDays(date, 6 - weekdayMondayFirst(date));
}

/** Monday-first weeks for a month; days outside the month are null. */
export function monthGrid(month: IsoMonth): Array<Array<IsoDate | null>> {
  const first = `${month}-01`;
  const lead = weekdayMondayFirst(first);
  const total = daysInMonth(month);
  const cells: Array<IsoDate | null> = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= total; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Array<Array<IsoDate | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export const WEEKDAYS = [
  { short: "Mo", long: "Monday" },
  { short: "Tu", long: "Tuesday" },
  { short: "We", long: "Wednesday" },
  { short: "Th", long: "Thursday" },
  { short: "Fr", long: "Friday" },
  { short: "Sa", long: "Saturday" },
  { short: "Su", long: "Sunday" },
] as const;

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-CA", { ...opts, timeZone: "UTC" });

/** Selected-day panel heading (PRD FR-30): "Tuesday 3 November". */
export function dayHeading(date: IsoDate): string {
  const d = utc(date);
  return `${fmt({ weekday: "long" }).format(d)} ${d.getUTCDate()} ${fmt({ month: "long" }).format(d)}`;
}

/** Cell label for screen readers: "Tuesday 3 November 2026". */
export function dayLabel(date: IsoDate): string {
  return `${dayHeading(date)} ${date.slice(0, 4)}`;
}

export function monthName(month: IsoMonth): { name: string; year: string } {
  return { name: fmt({ month: "long" }).format(utc(`${month}-01`)), year: month.slice(0, 4) };
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

export type SpecialDate = { date: IsoDate; label: string };

/**
 * settings.special_dates (edited in Settings, Phase 11): [{ "date": "1994-05-08", "label": "Nurat’s birthday" }].
 * Anything malformed is skipped. Each date repeats every year on its month and day.
 */
export function parseSpecialDates(json: unknown): SpecialDate[] {
  if (!Array.isArray(json)) return [];
  const out: SpecialDate[] = [];
  for (const item of json) {
    if (!item || typeof item !== "object") continue;
    const { date, label } = item as Record<string, unknown>;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (iso(utc(date)) !== date) continue;
    out.push({
      date,
      label: typeof label === "string" && label.trim() ? label.trim().slice(0, 80) : "Special day",
    });
  }
  return out;
}

/** The day a yearly date falls on in `month` (29 Feb → 28 Feb in other years), or null if not this month. */
function yearlyIn(month: IsoMonth, original: IsoDate): IsoDate | null {
  if (original.slice(5, 7) !== month.slice(5, 7)) return null;
  const day = Math.min(Number(original.slice(8, 10)), daysInMonth(month));
  return `${month}-${String(day).padStart(2, "0")}`;
}

/** Hearts for the month (PRD FR-31): the anniversary ("4th anniversary") and every special date. */
export function specialDaysIn(
  month: IsoMonth,
  anniversary: IsoDate | null,
  specials: SpecialDate[],
): Record<IsoDate, string[]> {
  const out: Record<IsoDate, string[]> = {};
  const add = (date: IsoDate, label: string) => (out[date] ??= []).push(label);

  if (anniversary) {
    const day = yearlyIn(month, anniversary);
    const years = Number(month.slice(0, 4)) - Number(anniversary.slice(0, 4));
    if (day && years >= 0) add(day, years === 0 ? "The day it began" : `${ordinal(years)} anniversary`);
  }
  for (const s of specials) {
    const day = yearlyIn(month, s.date);
    if (day && Number(month.slice(0, 4)) >= Number(s.date.slice(0, 4))) add(day, s.label);
  }
  return out;
}
