import { z } from "zod";

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Settings › Profile (PRD FR-3). Lengths match the CHECK constraints on public.profiles. */
export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, { error: "Enter a display name." })
    .max(60, { error: "Keep it to 60 characters or fewer." }),
  nickname: z
    .string()
    .trim()
    .min(1, { error: "Enter a nickname." })
    .max(40, { error: "Keep it to 40 characters or fewer." }),
  timezone: z.string().trim().min(1, { error: "Choose a time zone." }).refine(isValidTimeZone, {
    error: "Choose a time zone from the list.",
  }),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const avatarCropSchema = z.object({
  x: z.coerce.number().int().min(0).max(100_000),
  y: z.coerce.number().int().min(0).max(100_000),
  size: z.coerce.number().int().min(1).max(100_000),
});
