"use server";

import { revalidatePath } from "next/cache";

import { allVariantPaths, parseVariants, variantPath } from "@/lib/images/variants";
import { createClient } from "@/lib/supabase/server";
import {
  type PhotoFilter,
  PHOTO_PAGE_SIZE,
  photoFilterSchema,
  updatePhotoSchema,
  type UpdatePhotoInput,
} from "@/lib/validation/photo";
import { removeFiles, syncPublicCopies } from "@/server/photos/storage";
import { PHOTO_BUCKET, PUBLIC_PHOTO_BUCKET, signPaths } from "@/server/queries/photos";
import { type LibraryPhoto, applyPhotoFilter } from "@/server/queries/photo-library";

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Infinite scroll on /admin/photos: the next page of the current filter, newest first. */
export async function listPhotos(
  filter: PhotoFilter,
  offset: number,
): Promise<{ photos: LibraryPhoto[]; more: boolean }> {
  const parsedFilter = photoFilterSchema.catch("all").parse(filter);
  const from = Math.max(0, Math.floor(Number(offset) || 0));
  const { supabase, user } = await signedIn();
  if (!user) return { photos: [], more: false };

  const query = applyPhotoFilter(
    supabase
      .from("photo_library")
      .select("id, variants, width, height, caption, in_gallery, on_about, in_public_entry, is_public"),
    parsedFilter,
  )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + PHOTO_PAGE_SIZE);
  const { data } = await query;
  const rows = data ?? [];
  const page = rows.slice(0, PHOTO_PAGE_SIZE);
  const thumbs = await signPaths(
    supabase,
    page.map((r) => variantPath(parseVariants(r.variants), "400", "webp")),
  );
  return {
    photos: page.map((r, i) => ({
      id: r.id,
      thumbUrl: thumbs[i] ?? null,
      caption: r.caption,
      width: r.width,
      height: r.height,
      inGallery: r.in_gallery,
      onAbout: r.on_about,
      inPublicEntry: r.in_public_entry,
      isPublic: r.is_public,
    })),
    more: rows.length > PHOTO_PAGE_SIZE,
  };
}

export type PhotoDetail = {
  id: string;
  caption: string | null;
  createdAt: string;
  width: number | null;
  height: number | null;
  inGallery: boolean;
  onAbout: boolean;
  inPublicEntry: boolean;
  isPublic: boolean;
  urls: { webp: string | null; jpeg: string | null; webp2400: string | null };
  entries: Array<{
    id: string;
    title: string;
    visibility: "private" | "public";
    status: "draft" | "published";
  }>;
};

/** Lightbox data: 1200/2400 px URLs, flags and the entries this photo belongs to. */
export async function getPhotoDetail(id: string): Promise<PhotoDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { supabase, user } = await signedIn();
  if (!user) return null;

  const [{ data: row }, { data: links }] = await Promise.all([
    supabase
      .from("photo_library")
      .select(
        "id, variants, caption, created_at, width, height, in_gallery, on_about, in_public_entry, is_public",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("entry_photos").select("entry_id").eq("photo_id", id),
  ]);
  if (!row) return null;

  const entryIds = (links ?? []).map((l) => l.entry_id);
  const { data: entries } = entryIds.length
    ? await supabase
        .from("entries")
        .select("id, title, visibility, status")
        .in("id", entryIds)
        .is("deleted_at", null)
        .order("entry_date", { ascending: false })
    : { data: [] };

  const set = parseVariants(row.variants);
  const [webp, jpeg, webp2400] = await signPaths(supabase, [
    variantPath(set, "1200", "webp"),
    variantPath(set, "1200", "jpeg"),
    variantPath(set, "2400", "webp"),
  ]);

  return {
    id: row.id,
    caption: row.caption,
    createdAt: row.created_at,
    width: row.width,
    height: row.height,
    inGallery: row.in_gallery,
    onAbout: row.on_about,
    inPublicEntry: row.in_public_entry,
    isPublic: row.is_public,
    urls: { webp: webp ?? null, jpeg: jpeg ?? null, webp2400: webp2400 ?? null },
    entries: (entries ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      visibility: e.visibility,
      status: e.status,
    })),
  };
}

export type UpdatePhotoResult =
  | { ok: true; message: string; photo: Pick<PhotoDetail, "caption" | "inGallery" | "onAbout" | "isPublic"> }
  | { ok: false; message: string };

/** updatePhoto (DESIGN.md §9): caption and the two public toggles. Public copies follow the new state. */
export async function updatePhoto(input: UpdatePhotoInput): Promise<UpdatePhotoResult> {
  const parsed = updatePhotoSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the photo details." };
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, message: "Your session has ended. Sign in again." };

  const { id, caption, in_gallery, on_about } = parsed.data;
  const patch: { caption?: string | null; in_gallery?: boolean; on_about?: boolean } = {};
  if (caption !== undefined) patch.caption = caption || null;
  if (in_gallery !== undefined) patch.in_gallery = in_gallery;
  if (on_about !== undefined) patch.on_about = on_about;

  const { data, error } = await supabase
    .from("photos")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "That change didn’t save. Try again." };

  if (in_gallery !== undefined || on_about !== undefined) await syncPublicCopies(supabase, [id]);

  const { data: after } = await supabase
    .from("photo_library")
    .select("caption, in_gallery, on_about, is_public")
    .eq("id", id)
    .single();
  revalidatePath("/admin/photos");

  const message =
    caption !== undefined
      ? "Caption saved."
      : in_gallery !== undefined
        ? in_gallery
          ? "Added to the public gallery."
          : "Removed from the public gallery."
        : on_about
          ? "Added to the About page."
          : "Removed from the About page.";
  return {
    ok: true,
    message,
    photo: {
      caption: after?.caption ?? null,
      inGallery: after?.in_gallery ?? false,
      onAbout: after?.on_about ?? false,
      isPublic: after?.is_public ?? false,
    },
  };
}

/**
 * deletePhoto: removes the photo for good — private files, public copies and the row (which detaches it from
 * entries). Entries that used it as their cover get their next photo as the cover.
 */
export async function deletePhoto(id: string): Promise<{ ok: boolean; message: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "That photo doesn’t exist." };
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, message: "Your session has ended. Sign in again." };

  const [{ data: row }, { data: links }] = await Promise.all([
    supabase.from("photos").select("id, variants, public_variants").eq("id", id).maybeSingle(),
    supabase.from("entry_photos").select("entry_id").eq("photo_id", id),
  ]);
  if (!row) return { ok: false, message: "That photo doesn’t exist." };

  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) return { ok: false, message: "Couldn’t delete that photo." };

  await Promise.all([
    removeFiles(supabase, PHOTO_BUCKET, allVariantPaths(parseVariants(row.variants))),
    removeFiles(supabase, PUBLIC_PHOTO_BUCKET, allVariantPaths(parseVariants(row.public_variants))),
  ]);

  for (const entryId of new Set((links ?? []).map((l) => l.entry_id))) {
    const { data: next } = await supabase
      .from("entry_photos")
      .select("photo_id")
      .eq("entry_id", entryId)
      .order("position")
      .limit(1)
      .maybeSingle();
    await supabase
      .from("entries")
      .update({ cover_photo_id: next?.photo_id ?? null })
      .eq("id", entryId)
      .is("cover_photo_id", null);
  }

  revalidatePath("/admin", "layout");
  return { ok: true, message: "Photo deleted." };
}
