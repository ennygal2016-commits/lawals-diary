import "server-only";

import type { PhotoFilter } from "@/lib/validation/photo";
import { PHOTO_FILTERS } from "@/lib/validation/photo";
import { createClient } from "@/lib/supabase/server";

export type LibraryPhoto = {
  id: string;
  thumbUrl: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  inGallery: boolean;
  onAbout: boolean;
  inPublicEntry: boolean;
  isPublic: boolean;
};

type FilterColumn = "in_gallery" | "on_about" | "in_public_entry" | "is_public";
interface Filterable<Q> {
  eq(column: FilterColumn, value: boolean): Q;
}

/** The WHERE for each chip. "Private" = not public in any way (FR-28). */
export function applyPhotoFilter<Q extends Filterable<Q>>(query: Q, filter: PhotoFilter): Q {
  switch (filter) {
    case "gallery":
      return query.eq("in_gallery", true);
    case "about":
      return query.eq("on_about", true);
    case "public-entries":
      return query.eq("in_public_entry", true);
    case "private":
      return query.eq("is_public", false);
    default:
      return query;
  }
}

/** Counts for every chip, in parallel. */
export async function getPhotoCounts(): Promise<Record<PhotoFilter, number>> {
  const supabase = await createClient();
  const results = await Promise.all(
    PHOTO_FILTERS.map(({ value }) =>
      applyPhotoFilter(supabase.from("photo_library").select("id", { count: "exact", head: true }), value),
    ),
  );
  return Object.fromEntries(PHOTO_FILTERS.map(({ value }, i) => [value, results[i]?.count ?? 0])) as Record<
    PhotoFilter,
    number
  >;
}
