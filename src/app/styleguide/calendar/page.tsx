import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/shell/page";
import { ToastProvider } from "@/components/ui/toast";
import { type IsoDate, daysInMonth, isIsoMonth, monthOf } from "@/lib/calendar";
import { CalendarPreview } from "./preview";
import { sampleDayEntries } from "./sample";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Calendar preview", robots: { index: false, follow: false } };

type Params = Promise<{ month?: string; day?: string; today?: string }>;

/**
 * Dev tool: the Calendar with sample entries and hearts, no database. "Today" is pinned to 2026-11-03 (override with
 * ?today=YYYY-MM-DD) so the layout and tests are stable.
 */
export default async function CalendarPreviewPage({ searchParams }: { searchParams: Params }) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();
  const params = await searchParams;
  const today: IsoDate =
    params.today && /^\d{4}-\d{2}-\d{2}$/.test(params.today) ? params.today : "2026-11-03";
  const month = isIsoMonth(params.month) ? params.month : monthOf(today);
  const n = Number(params.day);
  const selected: IsoDate | null =
    Number.isInteger(n) && n >= 1 && n <= daysInMonth(month)
      ? `${month}-${String(n).padStart(2, "0")}`
      : !params.day && monthOf(today) === month
        ? today
        : null;

  return (
    <ToastProvider>
      <main id="main" className="pb-24">
        <PageContainer width="narrow">
          <CalendarPreview
            month={month}
            selected={selected}
            today={today}
            dayEntries={sampleDayEntries(selected)}
          />
        </PageContainer>
      </main>
    </ToastProvider>
  );
}
