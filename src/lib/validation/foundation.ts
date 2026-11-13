import { z } from "zod";

import { isValidIsoDate } from "@/lib/validation/entry";
import type { ApplicationStatus, SchoolLevel } from "@/types/database";

/** PRD FR-32 / FR-34 — shared by the public form (browser) and /api/foundation/apply (server). */
export const SCHOOL_LEVELS: Array<{ value: SchoolLevel; label: string }> = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "tertiary", label: "Tertiary" },
  { value: "vocational", label: "Vocational" },
];

export const APPLICATION_STATUSES: Array<{ value: ApplicationStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "funded", label: "Funded (paid)" },
];

export const statusLabel = (s: ApplicationStatus) =>
  APPLICATION_STATUSES.find((x) => x.value === s)?.label ?? s;
export const levelLabel = (l: SchoolLevel) => SCHOOL_LEVELS.find((x) => x.value === l)?.label ?? l;

export const REASON_MAX = 2000;
export const DOCS_MAX = 5;
export const DOC_MAX_BYTES = 10 * 1024 * 1024;
export const AMOUNT_MAX = 100_000;
export const DOC_INPUT_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf,.heic,.heif";

/** Whole years between a date of birth and today ("yyyy-mm-dd" strings). */
export function ageOn(dob: string, today: string): number {
  const [by, bm, bd] = dob.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = today.split("-").map(Number) as [number, number, number];
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep it to ${max} characters.` })
    .optional()
    .transform((v) => (v ? v : undefined));

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.email({ error: "Enter a valid email address." }).optional());

const phone = optionalText(40).refine((v) => !v || /^[+()\d\s.-]{6,40}$/.test(v), {
  error: "Enter a phone number using digits, spaces, + or -.",
});

/** Checkbox values arrive as "on"/"true" from forms, true from JSON. */
const checked = z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean());

export function applicationSchema(today: string) {
  return z
    .object({
      applicant_name: z.string().trim().min(1, { error: "Enter the applicant’s full name." }).max(120),
      applicant_dob: z
        .string()
        .refine(isValidIsoDate, { error: "Enter the date of birth." })
        .refine((d) => d < today && ageOn(d, today) <= 60, { error: "Check the date of birth." }),
      applicant_phone: phone,
      applicant_email: optionalEmail,
      guardian_name: optionalText(120),
      guardian_relationship: optionalText(60),
      guardian_phone: phone,
      guardian_email: optionalEmail,
      school: z.string().trim().min(1, { error: "Enter the school’s name." }).max(200),
      level: z.enum(["primary", "secondary", "tertiary", "vocational"], { error: "Choose a level." }),
      class_year: z.string().trim().min(1, { error: "Enter the class or year." }).max(60),
      amount_requested: z.coerce
        .number({ error: "Enter an amount in Canadian dollars." })
        .positive({ error: "Enter an amount in Canadian dollars." })
        .max(AMOUNT_MAX, { error: `The most we can consider is CA$${AMOUNT_MAX.toLocaleString("en-CA")}.` })
        .transform((n) => Math.round(n * 100) / 100),
      reason: z
        .string()
        .trim()
        .min(20, { error: "Tell us a little more (at least 20 characters)." })
        .max(REASON_MAX, { error: `Keep it to ${REASON_MAX.toLocaleString("en-CA")} characters.` }),
      consent_data: checked.refine((v) => v, { error: "Please agree so we can consider the application." }),
      consent_contact: checked.refine((v) => v, { error: "Please agree so we can reply." }),
      // Honeypot: people never see or fill it.
      website: z.string().max(0).optional(),
    })
    .superRefine((v, ctx) => {
      if (!v.applicant_email && !v.guardian_email) {
        ctx.addIssue({
          code: "custom",
          path: ["applicant_email"],
          message: "Give at least one email (yours or a guardian’s) so we can send your reference number.",
        });
      }
      if (isValidIsoDate(v.applicant_dob) && ageOn(v.applicant_dob, today) < 18) {
        if (!v.guardian_name) {
          ctx.addIssue({
            code: "custom",
            path: ["guardian_name"],
            message: "Applicants under 18 need a parent or guardian.",
          });
        }
        if (!v.guardian_phone && !v.guardian_email) {
          ctx.addIssue({
            code: "custom",
            path: ["guardian_phone"],
            message: "Give the guardian’s phone or email.",
          });
        }
      }
    });
}

export type ApplicationInput = z.input<ReturnType<typeof applicationSchema>>;
export type ApplicationData = z.output<ReturnType<typeof applicationSchema>>;

export const REFERENCE_RE = /^FDN-\d{4}-\d{4,}$/;

/** Admin list filters (/admin/foundation?status=&q=&level=). */
export const adminFilterSchema = z.object({
  status: z.enum(["all", "new", "reviewing", "shortlisted", "approved", "declined", "funded"]).catch("all"),
  q: z
    .string()
    .catch("")
    .transform((s) =>
      s
        // Letters, digits, spaces and - ' . only: safe inside a PostgREST or() filter.
        .replace(/[^\p{L}\p{N}\s'.-]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80),
    ),
  level: z.enum(["all", "primary", "secondary", "tertiary", "vocational"]).catch("all"),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});
export type AdminFilters = z.output<typeof adminFilterSchema>;

export const statusChangeSchema = z.object({
  id: z.uuid(),
  status: z.enum(["new", "reviewing", "shortlisted", "approved", "declined", "funded"]),
  note: z.string().trim().max(2000).optional(),
});

export const noteSchema = z.object({
  id: z.uuid(),
  note: z.string().trim().min(1, { error: "Write a note first." }).max(2000),
});

export const paymentSchema = z.object({
  id: z.uuid(),
  amount: z.coerce.number({ error: "Enter the amount paid." }).min(0).max(AMOUNT_MAX),
  paid_on: z.string().refine(isValidIsoDate, { error: "Choose the payment date." }),
});
