import "server-only";

import { RESTORE_DAYS } from "@/lib/validation/entry";
import { sanitizeDoc, type RichDoc } from "@/lib/rich-text";
import { createClient } from "@/lib/supabase/server";
import type { EntryCategory, EntryStatus, Mood, PartnerKey, Visibility } from "@/types/database";
import { type PhotoThumb, photoThumbs } from "./photos";

export type EntryAuthor = { userId: string; name: string; nickname: string; partner: PartnerKey };

export type EntryDetail = {
  id: string;
  title: string;
  entryDate: string;
  location: string | null;
  mood: Mood | null;
  category: EntryCategory;
  visibility: Visibility;
  status: EntryStatus;
  body: RichDoc;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: EntryAuthor;
  photos: PhotoThumb[];
};

export type EntryComment = {
  id: string;
  body: string;
  createdAt: string;
  author: EntryAuthor;
};

async function authorsById(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("profiles").select("user_id, display_name, nickname, partner");
  return new Map(
    (data ?? []).map((p) => [
      p.user_id,
      {
        userId: p.user_id,
        name: p.display_name,
        nickname: p.nickname,
        partner: p.partner,
      } satisfies EntryAuthor,
    ]),
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One entry with photos (in order), for the read view and the edit form. null if it doesn't exist. */
export async function getEntry(id: string): Promise<EntryDetail | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const [{ data: e }, authors, { data: links }] = await Promise.all([
    supabase
      .from("entries")
      .select(
        "id, title, entry_date, location, mood, category, visibility, status, body_json, deleted_at, created_at, updated_at, author_id",
      )
      .eq("id", id)
      .maybeSingle(),
    authorsById(supabase),
    supabase.from("entry_photos").select("photo_id, position").eq("entry_id", id).order("position"),
  ]);
  if (!e) return null;

  const photos = await photoThumbs(
    supabase,
    (links ?? []).map((l) => l.photo_id),
  );
  return {
    id: e.id,
    title: e.title,
    entryDate: e.entry_date,
    location: e.location,
    mood: e.mood,
    category: e.category,
    visibility: e.visibility,
    status: e.status,
    body: sanitizeDoc(e.body_json),
    deletedAt: e.deleted_at,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
    author: authors.get(e.author_id) ?? { userId: e.author_id, name: "Unknown", nickname: "", partner: "a" },
    photos,
  };
}

export async function getComments(entryId: string): Promise<EntryComment[]> {
  const supabase = await createClient();
  const [{ data }, authors] = await Promise.all([
    supabase
      .from("comments")
      .select("id, body, created_at, author_id")
      .eq("entry_id", entryId)
      .is("deleted_at", null)
      .order("created_at"),
    authorsById(supabase),
  ]);
  return (data ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.created_at,
    author: authors.get(c.author_id) ?? { userId: c.author_id, name: "Unknown", nickname: "", partner: "a" },
  }));
}

export type DraftRow = { id: string; title: string; entryDate: string; updatedAt: string };
export type DeletedRow = DraftRow & { deletedAt: string; status: EntryStatus };

/** More → Drafts: the viewer's own drafts, and their entries deleted in the last 30 days. */
export async function getDraftsAndDeleted(
  userId: string,
): Promise<{ drafts: DraftRow[]; deleted: DeletedRow[] }> {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - RESTORE_DAYS * 86_400_000).toISOString();
  const [{ data: drafts }, { data: deleted }] = await Promise.all([
    supabase
      .from("entries")
      .select("id, title, entry_date, updated_at")
      .eq("author_id", userId)
      .eq("status", "draft")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("entries")
      .select("id, title, entry_date, updated_at, deleted_at, status")
      .eq("author_id", userId)
      .gte("deleted_at", cutoff)
      .order("deleted_at", { ascending: false })
      .limit(100),
  ]);
  return {
    drafts: (drafts ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      entryDate: d.entry_date,
      updatedAt: d.updated_at,
    })),
    deleted: (deleted ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      entryDate: d.entry_date,
      updatedAt: d.updated_at,
      deletedAt: d.deleted_at!,
      status: d.status,
    })),
  };
}
