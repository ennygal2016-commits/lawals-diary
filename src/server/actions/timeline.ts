"use server";

import { DEFAULT_FILTERS, type TimelineFilters } from "@/lib/timeline";
import { timelineFiltersSchema } from "@/lib/validation/timeline";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { type TimelinePage, fetchTimeline } from "@/server/queries/timeline";

const EMPTY: TimelinePage = { rows: [], total: 0, more: false };

/** Infinite scroll on /admin/timeline: the next page for the same filters. Signed-in partners only. */
export async function loadTimeline(filters: TimelineFilters, offset: number): Promise<TimelinePage> {
  if (!supabaseEnv()) return EMPTY;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;
  const parsed = timelineFiltersSchema.safeParse(filters);
  const safe = parsed.success ? (parsed.data as TimelineFilters) : DEFAULT_FILTERS;
  return fetchTimeline(safe, Number.isFinite(offset) ? offset : 0);
}
