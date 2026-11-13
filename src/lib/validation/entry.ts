import { z } from "zod";

import { isValidIsoDate } from "@/lib/iso-date";

import { MOODS, CATEGORIES } from "@/lib/moods";

export const TITLE_MAX = 120;
export const LOCATION_MAX = 200;
export const PHOTOS_MAX = 20;
export const COMMENT_MAX = 2000;
/** Restore window for soft-deleted entries (PRD FR-16). */
export const RESTORE_DAYS = 30;

export { isValidIsoDate };

/** Latest allowed entry date: today in the furthest-ahead time zone (UTC+14), so "today" is never rejected. */
export function latestEntryDate(now = new Date()): string {
  return new Date(now.getTime() + 14 * 3_600_000).toISOString().slice(0, 10);
}

const moodValues = MOODS.map((m) => m.value) as [string, ...string[]];
const categoryValues = CATEGORIES.map((c) => c.value) as [string, ...string[]];

/** Fields shared by autosave and save (PRD FR-13). body_json is sanitised separately (lib/rich-text). */
const entryFields = {
  id: z.uuid().optional(),
  title: z
    .string()
    .trim()
    .max(TITLE_MAX, { error: `Keep the title to ${TITLE_MAX} characters.` }),
  entry_date: z
    .string()
    .refine(isValidIsoDate, { error: "Choose a date." })
    .refine((d) => d >= "1900-01-01" && d <= latestEntryDate(), {
      error: "Choose today or an earlier date.",
    }),
  location: z
    .string()
    .trim()
    .max(LOCATION_MAX, { error: `Keep it to ${LOCATION_MAX} characters.` }),
  mood: z.enum(moodValues).nullable(),
  category: z.enum(categoryValues),
  visibility: z.enum(["private", "public"]),
  body_json: z.unknown(),
  photo_ids: z
    .array(z.uuid())
    .max(PHOTOS_MAX, { error: `Up to ${PHOTOS_MAX} photos.` })
    .refine((ids) => new Set(ids).size === ids.length, { error: "A photo is attached twice." }),
};

/** Autosave accepts a draft without a title (it just won't be stored until there is one). */
export const autosaveSchema = z.object(entryFields);

/** Save entry: the title is required. */
export const saveEntrySchema = z.object({
  ...entryFields,
  title: entryFields.title.min(1, { error: "Give the day a name." }),
});

export type EntryInput = z.input<typeof saveEntrySchema>;

export const commentSchema = z.object({
  entryId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, { error: "Write a comment first." })
    .max(COMMENT_MAX, { error: `Keep it to ${COMMENT_MAX.toLocaleString("en-CA")} characters.` }),
});

/** URL-safe slug for public entries: "rain-on-the-train-home-3f0c2b". Always unique thanks to the id suffix. */
export function slugFor(title: string, id: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  const suffix = id.replace(/-/g, "").slice(0, 6).toLowerCase();
  return base ? `${base}-${suffix}` : suffix;
}
