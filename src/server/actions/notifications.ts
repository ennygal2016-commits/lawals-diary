"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { type NotificationFeed, getNotificationFeed } from "@/server/queries/notifications";

const idsSchema = z.array(z.uuid()).max(100);

/**
 * markNotificationsRead (DESIGN.md §9). With ids: just those; without: every unread one ("Mark all read").
 * RLS limits updates to the signed-in partner's own rows.
 */
export async function markNotificationsRead(ids?: string[]): Promise<{ ok: boolean }> {
  const parsed = ids === undefined ? null : idsSchema.safeParse(ids);
  if (parsed && !parsed.success) return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (parsed?.success) {
    if (parsed.data.length === 0) return { ok: true };
    query = query.in("id", parsed.data);
  }
  const { error } = await query;
  return { ok: !error };
}

/** Fresh feed for the bell (on focus, or if Realtime drops). */
export async function refreshNotifications(): Promise<NotificationFeed | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? getNotificationFeed(user.id) : null;
}
