import "server-only";

import { parseVariants, variantPath } from "@/lib/images/variants";
import { createClient } from "@/lib/supabase/server";
import { TIMELINE_PAGE_SIZE, type TimelineFilters } from "@/lib/timeline";
import type { EntryCategory, Mood, PartnerKey, Visibility } from "@/types/database";
import { signPaths } from "./photos";

export type TimelineRow = {
  id: string;
  title: string;
  entryDate: string;
  category: EntryCategory;
  visibility: Visibility;
  mood: Mood | null;
  author: { name: string; partner: PartnerKey };
  commentCount: number;
  photoCount: number;
  thumbUrl: string | null;
  monthCount: number;
};

export type TimelinePage = { rows: TimelineRow[]; total: number; more: boolean };

/** One page of the timeline for the given filters (RLS applies — runs as the signed-in partner). */
export async function fetchTimeline(filters: TimelineFilters, offset: number): Promise<TimelinePage> {
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, partner");
  const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const authorId = filters.author
    ? (profiles ?? []).find((p) => p.partner === filters.author)?.user_id
    : null;

  const { data, error } = await supabase.rpc("timeline_search", {
    p_query: filters.q.trim() || null,
    p_visibility: filters.visibility === "all" ? null : filters.visibility,
    p_author: authorId ?? null,
    p_moods: filters.moods.length ? (filters.moods as Mood[]) : null,
    p_categories: filters.categories.length ? (filters.categories as EntryCategory[]) : null,
    p_from: filters.from,
    p_to: filters.to,
    p_has_photos: filters.hasPhotos,
    // One extra row tells us whether there is another page.
    p_limit: TIMELINE_PAGE_SIZE + 1,
    p_offset: Math.max(0, Math.floor(offset)),
  });
  if (error) throw new Error(`timeline_search failed: ${error.message}`);

  const all = data ?? [];
  const page = all.slice(0, TIMELINE_PAGE_SIZE);
  const thumbs = await signPaths(
    supabase,
    page.map((r) => variantPath(parseVariants(r.cover_variants), "400", "webp")),
  );

  return {
    rows: page.map((r, i) => {
      const author = byUser.get(r.author_id);
      return {
        id: r.id,
        title: r.title,
        entryDate: r.entry_date,
        category: r.category,
        visibility: r.visibility,
        mood: r.mood,
        author: author
          ? { name: author.display_name, partner: author.partner }
          : { name: "Unknown", partner: "a" },
        commentCount: r.comment_count,
        photoCount: r.photo_count,
        thumbUrl: thumbs[i] ?? null,
        monthCount: r.month_count,
      };
    }),
    total: all[0]?.total_count ?? 0,
    more: all.length > TIMELINE_PAGE_SIZE,
  };
}

export type TimelineStats = {
  total: number;
  byPartner: Array<{ name: string; partner: PartnerKey; count: number }>;
};

/** Header line: "412 ENTRIES · NURAT 214 · AFEEZ 198" — all published entries, whatever the filters. */
export async function getTimelineStats(): Promise<TimelineStats> {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, partner")
    .order("partner");
  const counts = await Promise.all(
    (profiles ?? []).map((p) =>
      supabase
        .from("entries")
        .select("id", { count: "exact", head: true })
        .eq("author_id", p.user_id)
        .eq("status", "published")
        .is("deleted_at", null),
    ),
  );
  const byPartner = (profiles ?? []).map((p, i) => ({
    name: p.display_name,
    partner: p.partner,
    count: counts[i]?.count ?? 0,
  }));
  return { total: byPartner.reduce((n, p) => n + p.count, 0), byPartner };
}
