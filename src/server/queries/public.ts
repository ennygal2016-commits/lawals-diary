import "server-only";

import { cache } from "react";

import { parseVariants, variantPath } from "@/lib/images/variants";
import { type RichDoc, sanitizeDoc } from "@/lib/rich-text";
import { createPublicClient, publicPhotoUrl } from "@/lib/supabase/public";
import type { EntryCategory, Mood, PartnerKey } from "@/types/database";

/**
 * Everything the public site reads, through the anon client and the public_* views only. Nothing here can see a
 * private row: the database decides (DESIGN.md §8).
 */

/** Is the public site on? Not configured (local dev, tests without Supabase) counts as on, showing empty pages. */
export const isPublicSiteOn = cache(async (): Promise<boolean> => {
  const db = createPublicClient();
  if (!db) return true;
  const { data } = await db.from("public_site").select("enabled").maybeSingle();
  return data?.enabled === true;
});

export type PublicPhoto = {
  id: string;
  thumb: string;
  full: string;
  caption: string | null;
  width: number | null;
  height: number | null;
};

function toPublicPhoto(p: {
  id: string;
  variants: unknown;
  caption: string | null;
  width: number | null;
  height: number | null;
}) {
  const set = parseVariants(p.variants);
  const thumb = publicPhotoUrl(variantPath(set, "400", "webp"));
  const full = publicPhotoUrl(variantPath(set, "1200", "webp"));
  return thumb && full
    ? { id: p.id, thumb, full, caption: p.caption, width: p.width, height: p.height }
    : null;
}

const isPhoto = (p: PublicPhoto | null): p is PublicPhoto => p !== null;

export type PublicEntrySummary = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  author: { name: string; partner: PartnerKey };
  cover: string | null;
};

export const JOURNAL_PAGE = 20;

/** /journal: public entries, newest first. */
export async function getPublicJournal(
  page: number,
): Promise<{ entries: PublicEntrySummary[]; more: boolean }> {
  const db = createPublicClient();
  if (!db) return { entries: [], more: false };
  const from = (page - 1) * JOURNAL_PAGE;
  const { data } = await db
    .from("public_entries")
    .select("slug, title, entry_date, body_text, author_name, author_partner, cover_photo_id, created_at")
    .not("slug", "is", null)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + JOURNAL_PAGE);
  const rows = (data ?? []).slice(0, JOURNAL_PAGE);
  const coverIds = rows.map((r) => r.cover_photo_id).filter((v): v is string => !!v);
  const { data: covers } = coverIds.length
    ? await db.from("public_photos").select("id, variants, caption, width, height").in("id", coverIds)
    : { data: [] };
  const coverOf = new Map((covers ?? []).map((c) => [c.id, toPublicPhoto(c)?.thumb ?? null]));
  return {
    entries: rows.map((r) => ({
      slug: r.slug!,
      title: r.title,
      date: r.entry_date,
      excerpt: r.body_text.replace(/\s+/g, " ").trim().slice(0, 220),
      author: { name: r.author_name, partner: r.author_partner },
      cover: r.cover_photo_id ? (coverOf.get(r.cover_photo_id) ?? null) : null,
    })),
    more: (data ?? []).length > JOURNAL_PAGE,
  };
}

export type PublicEntry = {
  slug: string;
  title: string;
  date: string;
  category: EntryCategory;
  location: string | null;
  mood: Mood | null;
  body: RichDoc;
  excerpt: string;
  author: { name: string; partner: PartnerKey };
  photos: PublicPhoto[];
  comments: Array<{ id: string; body: string; author: string; partner: PartnerKey; at: string }> | null;
};

/** /journal/[slug]: one public entry with its public photos and (only if the author opted in) comments. */
export const getPublicEntry = cache(async (slug: string): Promise<PublicEntry | null> => {
  const db = createPublicClient();
  if (!db || !/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const { data: e } = await db.from("public_entries").select("*").eq("slug", slug).maybeSingle();
  if (!e) return null;
  const [{ data: links }, comments] = await Promise.all([
    db.from("public_entry_photos").select("photo_id, position").eq("entry_id", e.id).order("position"),
    e.show_comments
      ? db
          .from("public_comments")
          .select("id, body, author_name, author_partner, created_at")
          .eq("entry_id", e.id)
          .order("created_at")
      : Promise.resolve({ data: null }),
  ]);
  const ids = (links ?? []).map((l) => l.photo_id);
  const { data: photos } = ids.length
    ? await db.from("public_photos").select("id, variants, caption, width, height").in("id", ids)
    : { data: [] };
  const byId = new Map((photos ?? []).map((p) => [p.id, toPublicPhoto(p)]));
  return {
    slug,
    title: e.title,
    date: e.entry_date,
    category: e.category,
    location: e.location,
    mood: e.mood,
    body: sanitizeDoc(e.body_json),
    excerpt: e.body_text.replace(/\s+/g, " ").trim().slice(0, 200),
    author: { name: e.author_name, partner: e.author_partner },
    photos: ids.map((id) => byId.get(id) ?? null).filter(isPhoto),
    comments: comments.data
      ? comments.data.map((c) => ({
          id: c.id,
          body: c.body,
          author: c.author_name,
          partner: c.author_partner,
          at: c.created_at,
        }))
      : null,
  };
});

/** /gallery: photos marked "Show in public gallery". */
export async function getPublicGallery(): Promise<PublicPhoto[]> {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db
    .from("public_photos")
    .select("id, variants, caption, width, height")
    .eq("in_gallery", true)
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []).map(toPublicPhoto).filter(isPhoto);
}

/** Sitemap: public entry slugs + dates. */
export async function getPublicSlugs(): Promise<Array<{ slug: string; updated: string }>> {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db
    .from("public_entries")
    .select("slug, updated_at")
    .not("slug", "is", null)
    .limit(5000);
  return (data ?? []).map((r) => ({ slug: r.slug!, updated: r.updated_at }));
}
