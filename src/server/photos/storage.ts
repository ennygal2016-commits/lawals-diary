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
import { createServiceClient } from "@/lib/supabase/service";
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
    await removeFiles(supabase, PHOTO_BUCKET, paths);
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
    await removeFiles(supabase, PHOTO_BUCKET, paths);
    throw new Error(error.message);
  }
  return { id, variants };
}

/**
 * Deletes files and makes sure they are really gone. Supabase's remove() can answer "ok" while deleting nothing
 * (objects filtered out by a storage policy, or a transient failure), which once left a photo's public copies
 * reachable after it was made private. So: count what was removed, retry, then fall back to the service role —
 * callers have already checked the user is one of the two admins. Returns true only when every file is gone.
 */
export async function removeFiles(supabase: Client, bucket: string, paths: string[]): Promise<boolean> {
  let left = [...new Set(paths)].filter(Boolean);
  for (let attempt = 0; attempt < 2 && left.length; attempt++) {
    const { data, error } = await supabase.storage.from(bucket).remove(left);
    if (!error) {
      const gone = new Set((data ?? []).map((o) => o.name));
      left = left.filter((p) => !gone.has(p));
    }
  }
  if (left.length) {
    const service = createServiceClient();
    const { data, error } = await service.storage.from(bucket).remove(left);
    if (!error) {
      const gone = new Set((data ?? []).map((o) => o.name));
      left = left.filter((p) => !gone.has(p));
    }
  }
  if (left.length) console.error(`removeFiles: ${left.length} file(s) in ${bucket} could not be deleted`);
  return left.length === 0;
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
        await removeFiles(supabase, PUBLIC_PHOTO_BUCKET, allVariantPaths(copies));
        continue;
      }
      // Race-safe: only record our copies if nobody else did in the meantime (two saves at once would otherwise
      // leave one set of public files that nothing points to — still reachable by URL). The loser cleans up.
      const { data: won } = await supabase
        .from("photos")
        .update({ public_variants: copies })
        .eq("id", row.id)
        .is("public_variants", null)
        .select("id");
      if (!won?.length) await removeFiles(supabase, PUBLIC_PHOTO_BUCKET, allVariantPaths(copies));
    } else if (!row.is_public && hasCopies) {
      // Only forget the copies once they are really deleted; otherwise the next sync tries again.
      if (await removeFiles(supabase, PUBLIC_PHOTO_BUCKET, allVariantPaths(current))) {
        await supabase.from("photos").update({ public_variants: null }).eq("id", row.id);
      }
    }
  }
}

/** Photo ids attached to the given entries. */
export async function photoIdsOfEntries(supabase: Client, entryIds: string[]): Promise<string[]> {
  if (entryIds.length === 0) return [];
  const { data } = await supabase.from("entry_photos").select("photo_id").in("entry_id", entryIds);
  return (data ?? []).map((r) => r.photo_id);
}
