"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { AVATAR_MAX_BYTES, AvatarError, processAvatar } from "@/lib/images/avatar";
import type { NotifyPrefs } from "@/lib/notifications";
import { notifyPrefsSchema } from "@/lib/validation/notifications";
import { createClient } from "@/lib/supabase/server";
import { avatarCropSchema, profileSchema, type ProfileInput } from "@/lib/validation/profile";
import { AVATAR_BUCKET } from "@/server/queries/viewer";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Partial<Record<keyof ProfileInput, string>> };

const SIGNED_OUT: ActionResult = { ok: false, message: "Your session has ended. Sign in again." };
const SAVE_FAILED: ActionResult = { ok: false, message: "That didn’t save. Try again in a moment." };

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** updateProfile (DESIGN.md §9). RLS only lets a partner update their own row, and only these columns. */
export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof ProfileInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ProfileInput;
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, message: "Check the highlighted fields.", fieldErrors };
  }

  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;

  const { error } = await supabase.from("profiles").update(parsed.data).eq("user_id", user.id);
  if (error) return SAVE_FAILED;

  revalidatePath("/admin", "layout");
  return { ok: true, message: "Profile saved." };
}

/**
 * Avatar upload: the original never reaches storage. processAvatar sniffs the format, applies orientation,
 * crops the chosen square and re-encodes without any metadata.
 */
export async function uploadAvatar(formData: FormData): Promise<ActionResult> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image first." };
  if (file.size > AVATAR_MAX_BYTES) return { ok: false, message: "Choose an image under 10 MB." };

  const crop = avatarCropSchema.safeParse({
    x: formData.get("x"),
    y: formData.get("y"),
    size: formData.get("size"),
  });
  if (!crop.success) return { ok: false, message: "That crop didn’t come through. Try again." };

  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;

  let webp: Buffer;
  try {
    webp = await processAvatar(Buffer.from(await file.arrayBuffer()), crop.data);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof AvatarError ? err.message : "That image couldn’t be processed.",
    };
  }

  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("user_id", user.id)
    .single();

  const path = `avatars/${user.id}/${randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, webp, { contentType: "image/webp", cacheControl: "3600", upsert: false });
  if (uploadError) return SAVE_FAILED;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_path: path })
    .eq("user_id", user.id);
  if (updateError) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    return SAVE_FAILED;
  }

  if (current?.avatar_path) await supabase.storage.from(AVATAR_BUCKET).remove([current.avatar_path]);

  revalidatePath("/admin", "layout");
  return { ok: true, message: "Photo updated." };
}

export async function removeAvatar(): Promise<ActionResult> {
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;

  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("user_id", user.id)
    .single();
  const { error } = await supabase.from("profiles").update({ avatar_path: null }).eq("user_id", user.id);
  if (error) return SAVE_FAILED;
  if (current?.avatar_path) await supabase.storage.from(AVATAR_BUCKET).remove([current.avatar_path]);

  revalidatePath("/admin", "layout");
  return { ok: true, message: "Photo removed." };
}

/** Settings › Notifications (PRD FR-41): instant, daily digest or off, per type. */
export async function updateNotificationPrefs(input: NotifyPrefs): Promise<ActionResult> {
  const parsed = notifyPrefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Choose instant, daily or off for each type." };
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;
  const { error } = await supabase
    .from("profiles")
    .update({ notify_prefs: parsed.data })
    .eq("user_id", user.id);
  if (error) return SAVE_FAILED;
  return { ok: true, message: "Email settings saved." };
}
