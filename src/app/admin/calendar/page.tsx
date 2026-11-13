import type { Metadata } from "next";

import { CalendarView } from "@/components/calendar/calendar-view";
import { PageContainer } from "@/components/shell/page";
import { type IsoDate, daysInMonth, isIsoMonth, monthOf } from "@/lib/calendar";
import { calendarDate } from "@/lib/dates";
import { getCalendarMonth, getDayEntries } from "@/server/queries/calendar";
import { getViewer } from "@/server/queries/viewer";

export const metadata: Metadata = { title: "Calendar" };

type Params = Promise<{ month?: string | string[]; day?: string | string[] }>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** /admin/calendar?month=2026-11&day=3 (DESIGN.md §4). No day in the URL selects today in the current month. */
export default async function CalendarPage({ searchParams }: { searchParams: Params }) {
  const viewer = await getViewer();
  const params = await searchParams;
  const today = calendarDate(new Date(), viewer.timezone);

  const requestedMonth = first(params.month);
  const month = isIsoMonth(requestedMonth) ? requestedMonth : monthOf(today);
  const dayNumber = Number(first(params.day));
  let selected: IsoDate | null = null;
  if (Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= daysInMonth(month)) {
    selected = `${month}-${String(dayNumber).padStart(2, "0")}`;
  } else if (!first(params.day) && monthOf(today) === month) {
    selected = today;
  }

  const [data, dayEntries] = await Promise.all([
    getCalendarMonth(month),
    selected ? getDayEntries(selected) : Promise.resolve([]),
  ]);

  return (
    <PageContainer width="narrow">
      <CalendarView
        month={month}
        selected={selected}
        today={today}
        initialData={data}
        dayEntries={dayEntries}
      />
    </PageContainer>
  );
}
