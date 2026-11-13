"use client";

import * as React from "react";

import { CalendarView, type MonthLoader } from "@/components/calendar/calendar-view";
import type { IsoDate, IsoMonth } from "@/lib/calendar";
import type { DayEntry } from "@/server/queries/calendar";
import { sampleMonth } from "./sample";

export function CalendarPreview(props: {
  month: IsoMonth;
  selected: IsoDate | null;
  today: IsoDate;
  dayEntries: DayEntry[];
}) {
  const load: MonthLoader = React.useCallback(async (m) => sampleMonth(m), []);
  return <CalendarView {...props} initialData={sampleMonth(props.month)} loadMonth={load} />;
}
