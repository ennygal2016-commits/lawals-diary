import { z } from "zod";

import { isValidIsoDate } from "@/lib/iso-date";
import { CATEGORIES, MOODS } from "@/lib/moods";
import { CATEGORY_VALUES, MOOD_VALUES, SEARCH_MAX } from "@/lib/timeline";

/** Server-side guard for filters arriving from the client (infinite scroll). */
export const timelineFiltersSchema = z.object({
  q: z.string().max(SEARCH_MAX),
  visibility: z.enum(["all", "private", "public"]),
  author: z.enum(["a", "b"]).nullable(),
  moods: z.array(z.enum([...MOOD_VALUES] as [string, ...string[]])).max(MOODS.length),
  categories: z.array(z.enum([...CATEGORY_VALUES] as [string, ...string[]])).max(CATEGORIES.length),
  from: z.string().refine(isValidIsoDate).nullable(),
  to: z.string().refine(isValidIsoDate).nullable(),
  hasPhotos: z.boolean().nullable(),
});
