import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  PHOTO_CONTENT_TYPE,
  PHOTO_EXT,
  PHOTO_FORMATS,
  PHOTO_SIZES,
  type ProcessedPhoto,
} from "@/lib/images/photo";
import { type VariantSet, VARIANT_SIZES, allVariantPaths, parseVariants } from "@/lib/images/variants";
import type { Database } from "@/types/database";
import { PHOTO_BUCKET, PUBLIC_PHOTO_BUCKET } from "@/server/queries/photos";

type Client = SupabaseClient<Database>;

/**
 * Upload the six processed variants to photos-private and create the photos row, as the signed-in partner
 * (storage + table RLS apply). Cleans up the files if anything fails.
 */
export async function storeProcessedPhoto(supabase: Client, userId: string, processed: ProcessedPhoto) {
  const id = randomUUID();
  const base = `photos/${userId}/${id}`;
  const variants: VariantSet = {};
  const uploads: Array<Promise<{ path: string; error: unknown }>> = [];

  for (const size of PHOTO_SIZES) {
    const key = String(size) as keyof VariantSet;
    variants[key] = {};
    for (const format of PHOTO_FORMATS) {
      const path = `${base}/${size}.${PHOTO_EXT[format]}`;
      variants[key]![format] = path;
      uploads.push(
        supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, processed.variants[size][format], {
            contentType: PHOTO_CONTENT_TYPE[format],
            cacheControl: "3600",
            upsert: false,
          })
          .then(({ error }) => ({ path, error })),
      );
    }
  }

  const results = await Promise.all(uploads);
  const paths = allVariantPaths(variants);
  if (results.some((r) => r.error)) {
    await supabase.storage.from(PHOTO_BUCKET).remove(paths);
    throw new Error("upload failed");
  }

  const { error } = await supabase.from("photos").insert({
    id,
    uploader_id: userId,
    storage_path: variants["2400"]!.webp!,
    variants,
    width: processed.width,
    height: processed.height,
  });
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove(paths);
    throw new Error(error.message);
  }
  return { id, variants };
}

/**
 * PRD FR-28 / DESIGN.md §8: a photo is public when it is in the gallery, on the About page or attached to a public
 * entry. Public photos get copies in photos-public (unguessable folder per photo); photos that stop being public
 * lose them. Call with every photo id whose public state may have changed. Idempotent.
 */
export async function syncPublicCopies(supabase: Client, photoIds: Iterable<string>): Promise<void> {
  const ids = [...new Set(photoIds)];
  if (ids.length === 0) return;

  const { data: rows } = await supabase
    .from("photo_library")
    .select("id, variants, public_variants, is_public")
    .in("id", ids);

  for (const row of rows ?? []) {
    const current = parseVariants(row.public_variants);
    const hasCopies = allVariantPaths(current).length > 0;

    if (row.is_public && !hasCopies) {
      const source = parseVariants(row.variants);
      const folder = `${row.id}-${randomBytes(12).toString("hex")}`;
      const copies: VariantSet = {};
      let failed = false;
      for (const size of VARIANT_SIZES) {
        for (const format of ["webp", "jpeg"] as const) {
          const from = source[size]?.[format];
          if (!from) continue;
          const to = `${folder}/${size}.${PHOTO_EXT[format]}`;
          const { error } = await supabase.storage
            .from(PHOTO_BUCKET)
            .copy(from, to, { destinationBucket: PUBLIC_PHOTO_BUCKET });
          if (error) {
            failed = true;
            break;
          }
          copies[size] = { ...copies[size], [format]: to };
        }
        if (failed) break;
      }
      if (failed) {
        await supabase.storage.from(PUBLIC_PHOTO_BUCKET).remove(allVariantPaths(copies));
        continue;
      }
      await supabase.from("photos").update({ public_variants: copies }).eq("id", row.id);
    } else if (!row.is_public && hasCopies) {
      await supabase.storage.from(PUBLIC_PHOTO_BUCKET).remove(allVariantPaths(current));
      await supabase.from("photos").update({ public_variants: null }).eq("id", row.id);
    }
  }
}

/** Photo ids attached to the given entries. */
export async function photoIdsOfEntries(supabase: Client, entryIds: string[]): Promise<string[]> {
  if (entryIds.length === 0) return [];
  const { data } = await supabase.from("entry_photos").select("photo_id").in("entry_id", entryIds);
  return (data ?? []).map((r) => r.photo_id);
}
