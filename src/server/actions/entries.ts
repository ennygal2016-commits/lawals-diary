"use server";

import { revalidatePath } from "next/cache";

import { docToPlainText, sanitizeDoc } from "@/lib/rich-text";
import { createClient } from "@/lib/supabase/server";
import {
  type EntryInput,
  RESTORE_DAYS,
  autosaveSchema,
  commentSchema,
  saveEntrySchema,
  slugFor,
} from "@/lib/validation/entry";
import type { Database } from "@/types/database";
import { excerptOf } from "@/lib/notifications";
import { notifyPartner } from "@/server/notifications/notify";
import { photoIdsOfEntries, syncPublicCopies } from "@/server/photos/storage";
import { type PhotoThumb, signThumbs } from "@/server/queries/photos";

type EntryUpdate = Database["public"]["Tables"]["entries"]["Update"];

export type FieldErrors = Partial<Record<keyof EntryInput, string>>;
export type AutosaveResult =
  | { ok: true; id: string; savedAt: string }
  | { ok: false; reason: "needs-title" | "invalid" | "not-draft" | "signed-out" | "failed"; message: string };
export type SaveResult = { ok: true; id: string } | { ok: false; message: string; fieldErrors?: FieldErrors };
export type SimpleResult = { ok: true; message: string } | { ok: false; message: string };

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function fieldErrorsOf(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0] as keyof EntryInput;
    out[key] ??= issue.message;
  }
  return out;
}

function columnsOf(data: {
  title: string;
  entry_date: string;
  location: string;
  mood: string | null;
  category: string;
  visibility: "private" | "public";
  body_json: unknown;
}) {
  const body = sanitizeDoc(data.body_json);
  return {
    title: data.title,
    entry_date: data.entry_date,
    location: data.location || null,
    mood: (data.mood ?? null) as EntryUpdate["mood"],
    category: data.category as NonNullable<EntryUpdate["category"]>,
    visibility: data.visibility,
    body_json: body,
    body_text: docToPlainText(body),
  };
}

/** Replace the entry's photo list (order = position) and set the cover to the first photo. */
async function syncPhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entryId: string,
  photoIds: string[],
) {
  const { data: existing } = await supabase.from("entry_photos").select("photo_id").eq("entry_id", entryId);
  const keep = new Set(photoIds);
  const remove = (existing ?? []).map((r) => r.photo_id).filter((id) => !keep.has(id));
  if (remove.length)
    await supabase.from("entry_photos").delete().eq("entry_id", entryId).in("photo_id", remove);
  if (photoIds.length) {
    await supabase.from("entry_photos").upsert(
      photoIds.map((photo_id, position) => ({ entry_id: entryId, photo_id, position })),
      { onConflict: "entry_id,photo_id" },
    );
  }
  await supabase
    .from("entries")
    .update({ cover_photo_id: photoIds[0] ?? null })
    .eq("id", entryId);
}

/**
 * autosaveDraft (PRD FR-15). Creates the draft on the first save, then updates it. Only drafts are autosaved —
 * a published entry changes only when Save entry is pressed, so half-written edits never go public.
 */
export async function autosaveDraft(input: EntryInput): Promise<AutosaveResult> {
  const parsed = autosaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid", message: "Some fields need a look." };
  if (!parsed.data.title) {
    return { ok: false, reason: "needs-title", message: "Add a title to save a draft." };
  }

  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, reason: "signed-out", message: "Your session has ended. Sign in again." };

  const columns = columnsOf(parsed.data);
  let id = parsed.data.id;

  if (!id) {
    const { data, error } = await supabase
      .from("entries")
      .insert({ ...columns, author_id: user.id, status: "draft" })
      .select("id")
      .single();
    if (error || !data) return { ok: false, reason: "failed", message: "Couldn’t save the draft." };
    id = data.id;
  } else {
    const { data, error } = await supabase
      .from("entries")
      .update(columns)
      .eq("id", id)
      .eq("author_id", user.id)
      .eq("status", "draft")
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, reason: "failed", message: "Couldn’t save the draft." };
    if (!data) return { ok: false, reason: "not-draft", message: "This entry is already published." };
  }

  await syncPhotos(supabase, id, parsed.data.photo_ids);
  return { ok: true, id, savedAt: new Date().toISOString() };
}

/** createEntry / updateEntry: Save entry publishes (or re-saves) the entry. */
export async function saveEntry(input: EntryInput): Promise<SaveResult> {
  const parsed = saveEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error.issues),
    };
  }

  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, message: "Your session has ended. Sign in again." };

  const columns = columnsOf(parsed.data);
  let id = parsed.data.id;
  let firstPublish = false;

  if (!id) {
    const { data, error } = await supabase
      .from("entries")
      .insert({ ...columns, author_id: user.id, status: "draft" })
      .select("id")
      .single();
    if (error || !data) return { ok: false, message: "That didn’t save. Try again in a moment." };
    id = data.id;
  }

  const { data: current } = await supabase
    .from("entries")
    .select("status, slug, author_id, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!current || current.author_id !== user.id)
    return { ok: false, message: "Only the author can edit this entry." };
  if (current.deleted_at) return { ok: false, message: "This entry was deleted. Restore it first." };
  firstPublish = current.status === "draft";
  const photosBefore = await photoIdsOfEntries(supabase, [id]);

  const { error } = await supabase
    .from("entries")
    .update({ ...columns, status: "published", slug: current.slug ?? slugFor(columns.title, id) })
    .eq("id", id)
    .eq("author_id", user.id);
  if (error) return { ok: false, message: "That didn’t save. Try again in a moment." };

  await syncPhotos(supabase, id, parsed.data.photo_ids);
  // Photos added to / removed from a public entry, or the entry's visibility changed: copies follow (FR-28).
  await syncPublicCopies(supabase, [...photosBefore, ...parsed.data.photo_ids]);
  if (firstPublish) await notifyPartner(supabase, user.id, "entry", { entry_id: id, title: columns.title });

  revalidatePath("/admin", "layout");
  return { ok: true, id };
}

/** deleteEntry: soft delete — restorable for 30 days from the entry page or Drafts. */
export async function deleteEntry(id: string): Promise<SimpleResult> {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, message: "Your session has ended. Sign in again." };
  const { data, error } = await supabase
    .from("entries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("author_id", user.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "Couldn’t delete this entry." };
  await syncPublicCopies(supabase, await photoIdsOfEntries(supabase, [id]));
  revalidatePath("/admin", "layout");
  return { ok: true, message: `Entry deleted. You can restore it for ${RESTORE_DAYS} days.` };
}

export async function restoreEntry(id: string): Promise<SimpleResult> {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, message: "Your session has ended. Sign in again." };
  const cutoff = new Date(Date.now() - RESTORE_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("entries")
    .update({ deleted_at: null })
    .eq("id", id)
    .eq("author_id", user.id)
    .gte("deleted_at", cutoff)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "This entry can no longer be restored." };
  await syncPublicCopies(supabase, await photoIdsOfEntries(supabase, [id]));
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Entry restored." };
}

/** addComment (PRD FR-17): either partner, on any entry; the other partner is notified. */
export async function addComment(input: { entryId: string; body: string }): Promise<SimpleResult> {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the comment." };

  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, message: "Your session has ended. Sign in again." };

  const { error } = await supabase
    .from("comments")
    .insert({ entry_id: parsed.data.entryId, author_id: user.id, body: parsed.data.body });
  if (error) return { ok: false, message: "That comment didn’t post. Try again." };

  const { data: entry } = await supabase
    .from("entries")
    .select("title")
    .eq("id", parsed.data.entryId)
    .maybeSingle();
  await notifyPartner(supabase, user.id, "comment", {
    entry_id: parsed.data.entryId,
    title: entry?.title ?? "",
    excerpt: excerptOf(parsed.data.body),
  });
  revalidatePath(`/admin/entries/${parsed.data.entryId}`);
  return { ok: true, message: "Comment added." };
}

/** deleteComment: your own only (RLS enforces it too). Soft delete. */
export async function deleteComment(id: string): Promise<SimpleResult> {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, message: "Your session has ended. Sign in again." };
  const { data, error } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("author_id", user.id)
    .is("deleted_at", null)
    .select("entry_id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "Couldn’t delete that comment." };
  revalidatePath(`/admin/entries/${data.entry_id}`);
  return { ok: true, message: "Comment deleted." };
}

/** Photo library for the entry form ("attach from library"). Newest first, 40 at a time. */
export async function listLibraryPhotos(offset = 0): Promise<{ photos: PhotoThumb[]; more: boolean }> {
  const { supabase, user } = await signedIn();
  if (!user) return { photos: [], more: false };
  const from = Math.max(0, Math.floor(offset));
  const { data } = await supabase
    .from("photos")
    .select("id, variants, width, height")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, from + 40);
  const rows = data ?? [];
  const page = rows.slice(0, 40);
  return {
    photos: await signThumbs(supabase, page),
    more: rows.length > 40,
  };
}
