import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { PartnerKey } from "@/types/database";

export const AVATAR_BUCKET = "photos-private";
const AVATAR_URL_TTL_SECONDS = 60 * 60;

export type Viewer = {
  userId: string;
  email: string;
  partner: PartnerKey;
  displayName: string;
  nickname: string;
  timezone: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  unreadCount: number;
};

/**
 * The signed-in partner, once per request. Middleware already keeps signed-out visitors away from /admin;
 * this is the second check (and covers a session that was revoked mid-request).
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("partner, display_name, nickname, timezone, avatar_path")
    .eq("user_id", user.id)
    .maybeSingle();
  // An authenticated user without an admin profile should be impossible (allowlist trigger) — fail closed.
  if (!profile) redirect("/auth/denied");

  let avatarUrl: string | null = null;
  if (profile.avatar_path) {
    const { data } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(profile.avatar_path, AVATAR_URL_TTL_SECONDS);
    avatarUrl = data?.signedUrl ?? null;
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    partner: profile.partner,
    displayName: profile.display_name,
    nickname: profile.nickname,
    timezone: profile.timezone,
    avatarPath: profile.avatar_path,
    avatarUrl,
    unreadCount: 0, // the bell reads the live count from getNotificationFeed (admin layout)
  };
});
