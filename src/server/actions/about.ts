"use server";

import { revalidatePath } from "next/cache";

import {
  type AboutDraft,
  aboutDraftSchema,
  aboutPhotoIds,
  parseMilestones,
  parsePhotoIds,
} from "@/lib/about";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { syncPublicCopies } from "@/server/photos/storage";

export type AboutResult =
  { ok: true; message: string; publishedAt?: string } | { ok: false; message: string };
const SIGNED_OUT: AboutResult = { ok: false, message: "Your session has ended. Sign in again." };

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function writeDraft(supabase: Awaited<ReturnType<typeof createClient>>, draft: AboutDraft) {
  const columns = {
    couple_names: draft.couple_names,
    hero_photo_id: draft.hero_photo_id,
    story_json: draft.story_json as unknown as Json,
    milestones: draft.milestones as unknown as Json,
    photo_ids: draft.photo_ids,
  };
  const { data: row } = await supabase.from("about_page").select("id").maybeSingle();
  return row
    ? supabase.from("about_page").update(columns).eq("id", row.id)
    : supabase.from("about_page").insert({ ...columns, singleton: true });
}

/** saveAbout (DESIGN.md §9): the draft only — the public page doesn't change until Publish. */
export async function saveAbout(input: unknown): Promise<AboutResult> {
  const parsed = aboutDraftSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the About page." };
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;
  const { error } = await writeDraft(supabase, parsed.data);
  if (error) return { ok: false, message: "The draft didn’t save. Try again." };
  revalidatePath("/admin/about");
  return { ok: true, message: "Draft saved." };
}

/**
 * publishAbout: save, copy the draft into published_snapshot, and make exactly the published photos public via
 * `on_about` (photos dropped since the last publish lose it) — public copies follow (syncPublicCopies).
 */
export async function publishAbout(input: unknown): Promise<AboutResult> {
  const parsed = aboutDraftSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the About page." };
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;

  const { error: saveError } = await writeDraft(supabase, parsed.data);
  if (saveError) return { ok: false, message: "That didn’t publish. Try again." };

  const { data: row } = await supabase.from("about_page").select("id, published_snapshot").single();
  if (!row) return { ok: false, message: "That didn’t publish. Try again." };
  const before = row.published_snapshot as Record<string, unknown> | null;
  const previous = before
    ? aboutPhotoIds({
        hero_photo_id: typeof before.hero_photo_id === "string" ? before.hero_photo_id : null,
        milestones: parseMilestones(before.milestones),
        photo_ids: parsePhotoIds(before.photo_ids),
      })
    : [];
  const next = aboutPhotoIds(parsed.data);
  const publishedAt = new Date().toISOString();

  const { error } = await supabase
    .from("about_page")
    .update({ published_snapshot: parsed.data as unknown as Json, published_at: publishedAt })
    .eq("id", row.id);
  if (error) return { ok: false, message: "That didn’t publish. Try again." };

  const dropped = previous.filter((id) => !next.includes(id));
  if (next.length) await supabase.from("photos").update({ on_about: true }).in("id", next);
  if (dropped.length) await supabase.from("photos").update({ on_about: false }).in("id", dropped);
  await syncPublicCopies(supabase, [...next, ...dropped]);

  revalidatePath("/admin/about");
  revalidatePath("/");
  return { ok: true, message: "Published. The Our story page is up to date.", publishedAt };
}
