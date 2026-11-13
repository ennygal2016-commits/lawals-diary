"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Heart, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  type IsoDate,
  type IsoMonth,
  WEEKDAYS,
  addDays,
  addMonths,
  dayHeading,
  dayLabel,
  endOfWeek,
  monthGrid,
  monthName,
  monthOf,
  shiftMonthKeepDay,
  startOfWeek,
} from "@/lib/calendar";
import { CATEGORIES, moodByValue } from "@/lib/moods";
import { cn } from "@/lib/utils";
import type { CalendarMonth, DayEntry } from "@/server/queries/calendar";

export type MonthLoader = (month: IsoMonth) => Promise<CalendarMonth | null>;

/** Default: GET /api/calendar?month=YYYY-MM (DESIGN.md §9). */
export const fetchCalendarMonth: MonthLoader = async (month) => {
  const res = await fetch(`/api/calendar?month=${month}`, { cache: "no-store" });
  return res.ok ? ((await res.json()) as CalendarMonth) : null;
};

function href(pathname: string, month: IsoMonth, day: IsoDate | null) {
  const p = new URLSearchParams({ month });
  if (day) p.set("day", String(Number(day.slice(8, 10))));
  return `${pathname}?${p.toString()}`;
}

/**
 * /admin/calendar (PRD FR-29–FR-31, DESIGN.md §3 Calendar cell). WAI-ARIA grid: arrows move focus by day/week,
 * Home/End to the start/end of the week, PageUp/PageDown by month (Shift for a year), Enter or Space selects.
 * Month and selected day live in the URL (?month=2026-11&day=3).
 */
export function CalendarView({
  month,
  selected,
  today,
  initialData,
  dayEntries,
  loadMonth = fetchCalendarMonth,
}: {
  month: IsoMonth;
  selected: IsoDate | null;
  today: IsoDate;
  initialData: CalendarMonth;
  dayEntries: DayEntry[];
  loadMonth?: MonthLoader;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = React.useTransition();
  const [data, setData] = React.useState<CalendarMonth>(initialData);
  const cache = React.useRef(new Map<IsoMonth, CalendarMonth>([[initialData.month, initialData]]));
  const [focused, setFocused] = React.useState<IsoDate>(
    selected ?? (monthOf(today) === month ? today : `${month}-01`),
  );
  const wantFocus = React.useRef(false);
  const gridRef = React.useRef<HTMLTableElement>(null);

  // Month changed (URL): fetch its dots from the API (cached per month), keep focus inside the new month.
  React.useEffect(() => {
    const cached = cache.current.get(month);
    if (cached) setData(cached);
    else {
      let cancelled = false;
      setData({ month, entries: {}, special: {} });
      void loadMonth(month).then((d) => {
        if (!d || cancelled) return;
        cache.current.set(month, d);
        setData(d);
      });
      return () => {
        cancelled = true;
      };
    }
  }, [month, loadMonth]);

  React.useEffect(() => {
    setFocused((f) =>
      monthOf(f) === month ? f : (selected ?? (monthOf(today) === month ? today : `${month}-01`)),
    );
  }, [month, selected, today]);

  // After keyboard navigation, move real focus to the focused cell (also across month changes).
  React.useEffect(() => {
    if (!wantFocus.current) return;
    const cell = gridRef.current?.querySelector<HTMLElement>(`[data-date="${focused}"]`);
    if (cell) {
      cell.focus();
      wantFocus.current = false;
    }
  }, [focused, month]);

  const go = (nextMonth: IsoMonth, day: IsoDate | null) =>
    startTransition(() => router.replace(href(pathname, nextMonth, day), { scroll: false }));

  function moveFocus(next: IsoDate) {
    wantFocus.current = true;
    setFocused(next);
    if (monthOf(next) !== month) go(monthOf(next), null);
  }

  function select(date: IsoDate) {
    setFocused(date);
    go(monthOf(date), date);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const k = event.key;
    let next: IsoDate | null = null;
    if (k === "ArrowLeft") next = addDays(focused, -1);
    else if (k === "ArrowRight") next = addDays(focused, 1);
    else if (k === "ArrowUp") next = addDays(focused, -7);
    else if (k === "ArrowDown") next = addDays(focused, 7);
    else if (k === "Home") next = startOfWeek(focused);
    else if (k === "End") next = endOfWeek(focused);
    else if (k === "PageUp") next = shiftMonthKeepDay(focused, event.shiftKey ? -12 : -1);
    else if (k === "PageDown") next = shiftMonthKeepDay(focused, event.shiftKey ? 12 : 1);
    else if (k === "Enter" || k === " ") {
      event.preventDefault();
      select(focused);
      return;
    }
    if (next) {
      event.preventDefault();
      moveFocus(next);
    }
  }

  const { name, year } = monthName(month);
  const weeks = monthGrid(month);
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);
  const selectedSpecial = selected ? (data.special[selected] ?? []) : [];

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="page-title m-0" aria-live="polite">
          <span className="visually-hidden">Calendar, </span>
          {name} <span className="text-subtle">{year}</span>
        </h1>
        <div className="flex gap-2">
          <Link
            href={href(pathname, prev, null)}
            replace
            scroll={false}
            aria-label={`Previous month, ${monthName(prev).name} ${monthName(prev).year}`}
            className="inline-flex size-12 items-center justify-center rounded-full border border-border-strong bg-surface text-fg no-underline hover:border-border-dashed"
          >
            <ChevronLeft aria-hidden className="size-5" strokeWidth={1.75} />
          </Link>
          <Link
            href={href(pathname, next, null)}
            replace
            scroll={false}
            aria-label={`Next month, ${monthName(next).name} ${monthName(next).year}`}
            className="inline-flex size-12 items-center justify-center rounded-full border border-border-strong bg-surface text-fg no-underline hover:border-border-dashed"
          >
            <ChevronRight aria-hidden className="size-5" strokeWidth={1.75} />
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div
          className={cn("rounded-panel border border-border bg-surface p-3 md:p-5", pending && "opacity-80")}
        >
          <table
            ref={gridRef}
            role="grid"
            aria-label={`${name} ${year}`}
            onKeyDown={onKeyDown}
            className="w-full table-fixed border-collapse"
          >
            <thead>
              <tr>
                {WEEKDAYS.map((d) => (
                  <th
                    key={d.short}
                    scope="col"
                    abbr={d.long}
                    className="pb-2 font-mono text-[11px] font-normal text-muted uppercase md:text-[12px]"
                  >
                    {d.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, w) => (
                <tr key={w}>
                  {week.map((date, i) =>
                    date ? (
                      <DayCell
                        key={date}
                        date={date}
                        today={today}
                        isSelected={date === selected}
                        isFocused={date === focused}
                        count={data.entries[date] ?? 0}
                        special={data.special[date] ?? []}
                        onSelect={() => select(date)}
                        onFocus={() => setFocused(date)}
                      />
                    ) : (
                      <td key={`blank-${w}-${i}`} role="gridcell" aria-hidden className="h-12" />
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul
          className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-[13px] text-muted"
          aria-label="Legend"
        >
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-1.5 rounded-full bg-accent" />
            Entry
          </li>
          <li className="flex items-center gap-2">
            <Heart aria-hidden className="size-3 fill-lavender text-lavender" strokeWidth={0} />
            Anniversary / special date
          </li>
        </ul>
      </div>

      <section aria-labelledby="day-heading" className="flex flex-col gap-3">
        {selected ? (
          <>
            <h2 id="day-heading" className="eyebrow m-0">
              {dayHeading(selected)}
            </h2>
            {selectedSpecial.length ? (
              <p className="m-0 flex flex-wrap items-center gap-2 text-[14px] text-lavender-text">
                <Heart aria-hidden className="size-3.5 fill-lavender text-lavender" strokeWidth={0} />
                {selectedSpecial.join(" · ")}
              </p>
            ) : null}
            {dayEntries.length ? (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {dayEntries.map((e) => (
                  <DayEntryRow key={e.id} entry={e} />
                ))}
              </ul>
            ) : (
              <EmptyState
                variant="dashed"
                message="Nothing written on this day."
                action={
                  selected <= today ? (
                    <Button asChild variant="secondary">
                      <Link href={`/admin/entries/new?date=${selected}`}>
                        <PenLine aria-hidden strokeWidth={1.75} />
                        Write about it
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            )}
          </>
        ) : (
          <>
            <h2 id="day-heading" className="visually-hidden">
              Selected day
            </h2>
            <p className="m-0 text-[15px] text-muted">Pick a day to see what you wrote.</p>
          </>
        )}
      </section>
    </div>
  );
}

function DayCell({
  date,
  today,
  isSelected,
  isFocused,
  count,
  special,
  onSelect,
  onFocus,
}: {
  date: IsoDate;
  today: IsoDate;
  isSelected: boolean;
  isFocused: boolean;
  count: number;
  special: string[];
  onSelect: () => void;
  onFocus: () => void;
}) {
  const isToday = date === today;
  const isFuture = date > today;
  const label = [
    dayLabel(date),
    isToday ? "today" : null,
    count ? `${count} ${count === 1 ? "entry" : "entries"}` : null,
    ...special,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <td
      role="gridcell"
      data-date={date}
      tabIndex={isFocused ? 0 : -1}
      aria-selected={isSelected}
      aria-current={isToday ? "date" : undefined}
      aria-label={label}
      onClick={onSelect}
      onFocus={onFocus}
      className="group h-12 cursor-pointer p-0 text-center align-top outline-none"
    >
      <span className="flex flex-col items-center gap-1 pt-1">
        <span
          className={cn(
            "inline-flex h-[30px] min-w-[34px] items-center justify-center rounded-full px-1 font-mono text-[14px] transition-colors md:text-[15px]",
            isToday
              ? "bg-inverse font-semibold text-inverse-ink"
              : isFuture
                ? "text-faint group-hover:bg-raised"
                : "text-fg group-hover:bg-raised",
            isSelected && "ring-[1.5px] ring-accent ring-offset-2 ring-offset-surface",
            "group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-accent",
          )}
        >
          {Number(date.slice(8, 10))}
        </span>
        <span aria-hidden className="flex h-2 items-center gap-1">
          {count ? <span className="size-1 rounded-full bg-accent" /> : null}
          {special.length ? <Heart className="size-2 fill-lavender text-lavender" strokeWidth={0} /> : null}
        </span>
      </span>
    </td>
  );
}

function DayEntryRow({ entry }: { entry: DayEntry }) {
  const category = CATEGORIES.find((c) => c.value === entry.category)?.label ?? entry.category;
  return (
    <li className="relative flex items-center gap-4 rounded-card border border-border bg-surface p-3 pr-5 transition-colors hover:border-border-strong">
      <div className="size-16 shrink-0 overflow-hidden rounded-tile bg-placeholder-tint">
        {entry.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
          <img src={entry.thumbUrl} alt="" className="size-full object-cover" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="serif m-0 truncate text-[20px] leading-tight">
          <Link
            href={`/admin/entries/${entry.id}`}
            className="text-fg no-underline after:absolute after:inset-0"
          >
            {entry.title}
          </Link>
        </h3>
        <p className="m-0 font-mono text-[12px] text-muted uppercase">
          {[entry.author.name, category, entry.mood ? moodByValue(entry.mood).label : null]
            .filter(Boolean)
            .join(" · ")}
          <span className="visually-hidden"> · {entry.visibility}</span>
        </p>
      </div>
    </li>
  );
}
