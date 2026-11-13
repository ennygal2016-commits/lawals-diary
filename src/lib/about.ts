import { z } from "zod";

import { type RichDoc, sanitizeDoc } from "@/lib/rich-text";
import { isValidIsoDate } from "@/lib/validation/entry";

/** About Us (PRD FR-39): the editor's draft and the snapshot that Publish makes public. */

export const MILESTONES_MAX = 20;
export const ABOUT_PHOTOS_MAX = 24;

export type Milestone = { id: string; date: string; title: string; text: string; photo_id: string | null };
export type AboutDraft = {
  couple_names: string;
  hero_photo_id: string | null;
  story_json: RichDoc;
  milestones: Milestone[];
  photo_ids: string[];
};

const milestoneSchema = z.object({
  id: z.string().min(1).max(40),
  date: z.string().refine(isValidIsoDate, { error: "Each milestone needs a date." }),
  title: z.string().trim().min(1, { error: "Each milestone needs a title." }).max(80),
  text: z.string().trim().max(300, { error: "Keep milestone text to 300 characters." }),
  photo_id: z.uuid().nullable(),
});

export const aboutDraftSchema = z.object({
  couple_names: z.string().trim().min(1, { error: "Enter your names." }).max(80),
  hero_photo_id: z.uuid().nullable(),
  story_json: z.unknown().transform((v) => sanitizeDoc(v)),
  milestones: z
    .array(milestoneSchema)
    .max(MILESTONES_MAX, { error: `Up to ${MILESTONES_MAX} milestones.` })
    // Always stored in date order, so draft and published snapshot compare equal when nothing changed.
    .transform((ms) => [...ms].sort((a, b) => a.date.localeCompare(b.date))),
  photo_ids: z
    .array(z.uuid())
    .max(ABOUT_PHOTOS_MAX, { error: `Up to ${ABOUT_PHOTOS_MAX} photos.` })
    .refine((ids) => new Set(ids).size === ids.length, { error: "A photo is chosen twice." }),
});

/** Read milestones from jsonb defensively (bad items dropped), sorted by date. */
export function parseMilestones(json: unknown): Milestone[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((m) => milestoneSchema.safeParse(m))
    .filter((r) => r.success)
    .map((r) => r.data)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function parsePhotoIds(json: unknown): string[] {
  return Array.isArray(json)
    ? json.filter((v): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v))
    : [];
}

/** Every photo the About page shows (hero, milestone photos, chosen photos) — these become `on_about`. */
export function aboutPhotoIds(d: Pick<AboutDraft, "hero_photo_id" | "milestones" | "photo_ids">): string[] {
  return [
    ...new Set(
      [d.hero_photo_id, ...d.milestones.map((m) => m.photo_id), ...d.photo_ids].filter(
        (v): v is string => !!v,
      ),
    ),
  ];
}

/** "Nurat & Afeez" → ["Nurat", "Afeez"] for the hero's italic ampersand; anything else stays whole. */
export function splitNames(names: string): [string, string] | null {
  const parts = names.split(/\s+(?:&|and)\s+/i);
  return parts.length === 2 && parts[0] && parts[1] ? [parts[0], parts[1]] : null;
}
