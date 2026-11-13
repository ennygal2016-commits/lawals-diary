import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { type VariantSet, parseVariants, variantPath } from "@/lib/images/variants";
import type { Database } from "@/types/database";

export const PHOTO_BUCKET = "photos-private";
export const PUBLIC_PHOTO_BUCKET = "photos-public";
const URL_TTL_SECONDS = 60 * 60;

/** Short-lived signed URLs for private photos, in one round trip. Missing paths map to null. */
export async function signPaths(
  supabase: SupabaseClient<Database>,
  paths: Array<string | undefined>,
): Promise<Array<string | null>> {
  const real = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (real.length === 0) return paths.map(() => null);
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(real, URL_TTL_SECONDS);
  const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return paths.map((p) => (p ? (byPath.get(p) ?? null) : null));
}

export type PhotoThumb = {
  id: string;
  /** 400 px WebP */
  thumbUrl: string | null;
  /** 1200 px WebP — the read view and lightbox size */
  fullUrl: string | null;
  width: number | null;
  height: number | null;
};

/** Signed thumbnail + full URLs for rows that carry `variants`. */
export async function signThumbs(
  supabase: SupabaseClient<Database>,
  rows: Array<{ id: string; variants: unknown; width: number | null; height: number | null }>,
): Promise<PhotoThumb[]> {
  const sets: VariantSet[] = rows.map((r) => parseVariants(r.variants));
  const [thumbs, fulls] = await Promise.all([
    signPaths(
      supabase,
      sets.map((v) => variantPath(v, "400", "webp")),
    ),
    signPaths(
      supabase,
      sets.map((v) => variantPath(v, "1200", "webp")),
    ),
  ]);
  return rows.map((r, i) => ({
    id: r.id,
    thumbUrl: thumbs[i] ?? null,
    fullUrl: fulls[i] ?? null,
    width: r.width,
    height: r.height,
  }));
}

/** Photos in the given order with thumbnail and full URLs. */
export async function photoThumbs(supabase: SupabaseClient<Database>, ids: string[]): Promise<PhotoThumb[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("photos")
    .select("id, variants, width, height")
    .in("id", ids)
    .is("deleted_at", null);
  const rows = new Map((data ?? []).map((r) => [r.id, r]));
  const ordered = ids.map((id) => rows.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));
  return signThumbs(supabase, ordered);
}
