import { z } from "zod";

import { isValidIsoDate } from "@/lib/validation/entry";

/** Settings › Dates (PRD FR-42, FR-31): the anniversary and yearly special dates shown as hearts on the calendar. */
export const datesSchema = z.object({
  anniversary: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || isValidIsoDate(v), { error: "Choose the anniversary date." }),
  special_dates: z
    .array(
      z.object({
        date: z.string().refine(isValidIsoDate, { error: "Each special date needs a date." }),
        label: z.string().trim().min(1, { error: "Each special date needs a name." }).max(80),
      }),
    )
    .max(50, { error: "Up to 50 special dates." }),
});
export type DatesInput = z.input<typeof datesSchema>;

/** Settings › Scripture: which translation the library uses and the licence line under the card. */
export const scriptureSchema = z.object({
  bible_translation: z
    .string()
    .trim()
    .min(2)
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/, { error: "Use the short code, e.g. KJV." }),
  bible_notice: z.string().trim().min(1, { error: "Enter the notice shown under the verse." }).max(200),
});

/** Daily content library (PRD FR-7, FR-42). */
export const dailyItemSchema = z
  .object({
    id: z.uuid().optional(),
    kind: z.enum(["scripture", "romance", "love", "faith", "encouragement"]),
    text: z.string().trim().min(1, { error: "Write the text." }).max(1000),
    attribution: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => v || null),
    reference: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((v) => v || null),
    translation: z
      .string()
      .trim()
      .max(12)
      .optional()
      .transform((v) => v || null),
    active: z.boolean().default(true),
  })
  .refine((v) => v.kind !== "scripture" || !!v.reference, {
    path: ["reference"],
    error: "Scripture needs a reference, e.g. John 15:12.",
  });
export type DailyItemInput = z.input<typeof dailyItemSchema>;
