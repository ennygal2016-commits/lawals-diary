import "server-only";

import { type SpecialDate, parseSpecialDates } from "@/lib/calendar";
import type { DailyItem } from "@/lib/daily";
import { createClient } from "@/lib/supabase/server";

export type SiteSettings = {
  anniversary: string | null;
  specialDates: SpecialDate[];
  bibleTranslation: string;
  bibleNotice: string;
  publicSiteEnabled: boolean;
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").maybeSingle();
  return {
    anniversary: data?.anniversary ?? null,
    specialDates: parseSpecialDates(data?.special_dates),
    bibleTranslation: data?.bible_translation ?? "KJV",
    bibleNotice: data?.bible_notice ?? "King James Version — public domain.",
    publicSiteEnabled: data?.public_site_enabled ?? false,
  };
}

/** The whole daily library, active and disabled, for the manager. */
export async function getDailyLibrary(): Promise<DailyItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_content")
    .select("id, kind, text, attribution, reference, translation, active")
    .order("created_at")
    .limit(5000);
  return (data ?? []) as DailyItem[];
}
