"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";
import {
  type DailyItemInput,
  type DatesInput,
  dailyItemSchema,
  datesSchema,
  scriptureSchema,
} from "@/lib/validation/settings";

export type SettingsResult = { ok: true; message: string; id?: string } | { ok: false; message: string };
const SIGNED_OUT: SettingsResult = { ok: false, message: "Your session has ended. Sign in again." };

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** The single settings row (created by the seed; created here if missing). */
async function updateSettings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patch: Database["public"]["Tables"]["settings"]["Update"],
): Promise<boolean> {
  const { data } = await supabase.from("settings").select("id").maybeSingle();
  const { error } = data
    ? await supabase.from("settings").update(patch).eq("id", data.id)
    : await supabase.from("settings").insert({ singleton: true, ...patch });
  return !error;
}

/** updateSettings (DESIGN.md §9) — anniversary and special dates. */
export async function saveDates(input: DatesInput): Promise<SettingsResult> {
  const parsed = datesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the dates." };
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;
  if (
    !(await updateSettings(supabase, {
      anniversary: parsed.data.anniversary,
      special_dates: parsed.data.special_dates as unknown as Json,
    }))
  )
    return { ok: false, message: "The dates didn’t save." };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Dates saved." };
}

export async function saveScripture(input: {
  bible_translation: string;
  bible_notice: string;
}): Promise<SettingsResult> {
  const parsed = scriptureSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the translation." };
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;
  if (!(await updateSettings(supabase, parsed.data))) return { ok: false, message: "That didn’t save." };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Scripture settings saved." };
}

/** The public site switch (PRD FR-42). Off: every public page shows “Coming soon” and the public views go empty. */
export async function setPublicSite(enabled: boolean): Promise<SettingsResult> {
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;
  if (!(await updateSettings(supabase, { public_site_enabled: enabled === true }))) {
    return { ok: false, message: "That didn’t save." };
  }
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: enabled ? "The public site is on." : "The public site is off — visitors see “Coming soon”.",
  };
}

/** upsertDailyContent (DESIGN.md §9): add or edit an item in the daily library. */
export async function upsertDailyContent(input: DailyItemInput): Promise<SettingsResult> {
  const parsed = dailyItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the item." };
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;
  const { id, ...fields } = parsed.data;
  const { data, error } = id
    ? await supabase.from("daily_content").update(fields).eq("id", id).select("id").maybeSingle()
    : await supabase.from("daily_content").insert(fields).select("id").single();
  if (error?.code === "23505") return { ok: false, message: "That text is already in the library." };
  if (error || !data) return { ok: false, message: "That didn’t save." };
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  return { ok: true, id: data.id, message: id ? "Saved." : "Added to the library." };
}

/** Disable (or re-enable) an item — disabled items are never picked for the daily cards. */
export async function setDailyActive(id: string, active: boolean): Promise<SettingsResult> {
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;
  const { error } = await supabase
    .from("daily_content")
    .update({ active: active === true })
    .eq("id", id);
  if (error) return { ok: false, message: "That didn’t save." };
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  return { ok: true, message: active ? "Turned back on." : "Turned off — it won’t be picked." };
}
