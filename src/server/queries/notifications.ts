import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/notifications";
import type { Json } from "@/types/database";

export const FEED_SIZE = 20;

export type FeedItem = {
  id: string;
  type: NotificationType;
  payload: Json;
  createdAt: string;
  read: boolean;
};

export type NotificationFeed = { items: FeedItem[]; unread: number };

/** The bell: the latest 20 notifications and the unread count (RLS: only your own). */
export async function getNotificationFeed(userId: string): Promise<NotificationFeed> {
  const supabase = await createClient();
  const [{ data }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, payload, created_at, read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(FEED_SIZE),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);
  return {
    items: (data ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      payload: n.payload,
      createdAt: n.created_at,
      read: n.read_at !== null,
    })),
    unread: count ?? 0,
  };
}

/** The signed-in partner's email preferences (Settings › Notifications). */
export async function getMyNotifyPrefs(userId: string) {
  const { parsePrefs } = await import("@/lib/notifications");
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("notify_prefs").eq("user_id", userId).maybeSingle();
  return parsePrefs(data?.notify_prefs);
}
