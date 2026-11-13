import "server-only";

import { type AboutDraft, aboutPhotoIds, parseMilestones, parsePhotoIds } from "@/lib/about";
import { parseVariants, variantPath } from "@/lib/images/variants";
import { EMPTY_DOC, sanitizeDoc } from "@/lib/rich-text";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient, publicPhotoUrl } from "@/lib/supabase/public";
import { signPaths } from "./photos";

export type StoryData = {
  coupleNames: string;
  since: string | null;
  heroUrl: string | null;
  story: AboutDraft["story_json"];
  milestones: Array<{ id: string; date: string; title: string; text: string; photoUrl: string | null }>;
  gallery: Array<{ id: string; url: string; caption: string | null }>;
};

function toStory(
  d: AboutDraft,
  urlOf: (id: string | null) => string | null,
  captions = new Map<string, string | null>(),
) {
  const milestones = [...d.milestones].sort((a, b) => a.date.localeCompare(b.date));
  return {
    coupleNames: d.couple_names,
    since: milestones[0]?.date.slice(0, 4) ?? null,
    heroUrl: urlOf(d.hero_photo_id),
    story: d.story_json,
    milestones: milestones.map((m) => ({ ...m, photoUrl: urlOf(m.photo_id) })),
    gallery: d.photo_ids
      .map((id) => ({ id, url: urlOf(id), caption: captions.get(id) ?? null }))
      .filter((p): p is { id: string; url: string; caption: string | null } => !!p.url),
  } satisfies StoryData;
}

function draftOf(row: {
  couple_names: string;
  hero_photo_id: string | null;
  story_json: unknown;
  milestones: unknown;
  photo_ids: string[] | unknown;
}): AboutDraft {
  return {
    couple_names: row.couple_names,
    hero_photo_id: row.hero_photo_id,
    story_json: row.story_json ? sanitizeDoc(row.story_json) : EMPTY_DOC,
    milestones: parseMilestones(row.milestones),
    photo_ids: parsePhotoIds(row.photo_ids),
  };
}

export type AboutEditorData = {
  draft: AboutDraft;
  thumbs: Record<string, string | null>;
  publishedAt: string | null;
  unpublishedChanges: boolean;
};

/** The About Us editor (PRD FR-39): the draft, thumbnails for its photos, and whether it differs from what's live. */
export async function getAboutEditor(): Promise<AboutEditorData> {
  const supabase = await createClient();
  const { data: row } = await supabase.from("about_page").select("*").maybeSingle();
  const draft = row
    ? draftOf(row)
    : {
        couple_names: "Nurat & Afeez",
        hero_photo_id: null,
        story_json: EMPTY_DOC,
        milestones: [],
        photo_ids: [],
      };
  const ids = aboutPhotoIds(draft);
  const { data: photos } = ids.length
    ? await supabase.from("photos").select("id, variants").in("id", ids)
    : { data: [] };
  const urls = await signPaths(
    supabase,
    (photos ?? []).map((p) => variantPath(parseVariants(p.variants), "400", "webp")),
  );
  const thumbs = Object.fromEntries((photos ?? []).map((p, i) => [p.id, urls[i] ?? null]));
  const unpublishedChanges =
    JSON.stringify(row?.published_snapshot ?? null) !== JSON.stringify(row ? draftOf(row) : null);
  return {
    draft,
    thumbs,
    publishedAt: row?.published_at ?? null,
    unpublishedChanges: row ? unpublishedChanges : true,
  };
}

/** Admin preview of the DRAFT, with private signed URLs (photos aren't public until Publish). */
export async function getAboutPreview(): Promise<StoryData> {
  const supabase = await createClient();
  const { draft } = await getAboutEditor();
  const ids = aboutPhotoIds(draft);
  const { data: photos } = ids.length
    ? await supabase.from("photos").select("id, variants, caption").in("id", ids)
    : { data: [] };
  const urls = await signPaths(
    supabase,
    (photos ?? []).map((p) => variantPath(parseVariants(p.variants), "1200", "webp")),
  );
  const byId = new Map((photos ?? []).map((p, i) => [p.id, urls[i] ?? null]));
  const captions = new Map((photos ?? []).map((p) => [p.id, p.caption]));
  return toStory(draft, (id) => (id ? (byId.get(id) ?? null) : null), captions);
}

/** The PUBLISHED story for / — anon client, public views, public photo copies. null if unpublished/off. */
export async function getPublicStory(): Promise<StoryData | null> {
  const db = createPublicClient();
  if (!db) return null;
  const { data: about } = await db.from("public_about").select("*").maybeSingle();
  if (!about) return null;
  const draft = draftOf({ ...about, photo_ids: about.photo_ids });
  const ids = aboutPhotoIds(draft);
  const { data: photos } = ids.length
    ? await db.from("public_photos").select("id, variants, caption").in("id", ids)
    : { data: [] };
  const byId = new Map(
    (photos ?? []).map((p) => [p.id, publicPhotoUrl(variantPath(parseVariants(p.variants), "1200", "webp"))]),
  );
  const captions = new Map((photos ?? []).map((p) => [p.id, p.caption]));
  return toStory(draft, (id) => (id ? (byId.get(id) ?? null) : null), captions);
}
