import "server-only";

import { type IsoDate, type IsoMonth, addMonths, parseSpecialDates, specialDaysIn } from "@/lib/calendar";
import { parseVariants, variantPath } from "@/lib/images/variants";
import { createClient } from "@/lib/supabase/server";
import type { EntryCategory, Mood, PartnerKey, Visibility } from "@/types/database";
import { signPaths } from "./photos";

export type CalendarMonth = {
  month: IsoMonth;
  /** Published entries per day: { "2026-11-03": 2 } */
  entries: Record<IsoDate, number>;
  /** Anniversary and special dates: { "2026-11-03": ["4th anniversary"] } */
  special: Record<IsoDate, string[]>;
};

/** Dots and hearts for one month (PRD FR-29, FR-31). Runs as the signed-in partner, so RLS applies. */
export async function getCalendarMonth(month: IsoMonth): Promise<CalendarMonth> {
  const supabase = await createClient();
  const [{ data: rows }, { data: settings }] = await Promise.all([
    supabase
      .from("entries")
      .select("entry_date")
      .eq("status", "published")
      .is("deleted_at", null)
      .gte("entry_date", `${month}-01`)
      .lt("entry_date", `${addMonths(month, 1)}-01`)
      .limit(5000),
    supabase.from("settings").select("anniversary, special_dates").maybeSingle(),
  ]);

  const entries: Record<IsoDate, number> = {};
  for (const r of rows ?? []) entries[r.entry_date] = (entries[r.entry_date] ?? 0) + 1;

  return {
    month,
    entries,
    special: specialDaysIn(month, settings?.anniversary ?? null, parseSpecialDates(settings?.special_dates)),
  };
}

export type DayEntry = {
  id: string;
  title: string;
  category: EntryCategory;
  mood: Mood | null;
  visibility: Visibility;
  author: { name: string; partner: PartnerKey };
  thumbUrl: string | null;
};

/** The selected day's published entries, oldest first (PRD FR-30). */
export async function getDayEntries(date: IsoDate): Promise<DayEntry[]> {
  const supabase = await createClient();
  const [{ data: rows }, { data: profiles }] = await Promise.all([
    supabase
      .from("entries")
      .select("id, title, category, mood, visibility, author_id, cover_photo_id, created_at")
      .eq("status", "published")
      .is("deleted_at", null)
      .eq("entry_date", date)
      .order("created_at"),
    supabase.from("profiles").select("user_id, display_name, partner"),
  ]);
  const list = rows ?? [];
  const coverIds = list.map((r) => r.cover_photo_id).filter((id): id is string => Boolean(id));
  const { data: covers } = coverIds.length
    ? await supabase.from("photos").select("id, variants").in("id", coverIds)
    : { data: [] };
  const coverPath = new Map(
    (covers ?? []).map((c) => [c.id, variantPath(parseVariants(c.variants), "400", "webp")]),
  );
  const thumbs = await signPaths(
    supabase,
    list.map((r) => (r.cover_photo_id ? coverPath.get(r.cover_photo_id) : undefined)),
  );
  const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  return list.map((r, i) => {
    const author = byUser.get(r.author_id);
    return {
      id: r.id,
      title: r.title,
      category: r.category,
      mood: r.mood,
      visibility: r.visibility,
      author: author
        ? { name: author.display_name, partner: author.partner }
        : { name: "Unknown", partner: "a" },
      thumbUrl: thumbs[i] ?? null,
    };
  });
}
