import "server-only";

import { formatDistanceStrict } from "date-fns";

import { type DailyItem, pickDaily } from "@/lib/daily";
import { calendarDate, noteStamp, togetherStats } from "@/lib/dates";
import { SHARED_TIMEZONE } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import type { DailyKind, EntryCategory, Mood, PartnerKey, Visibility } from "@/types/database";
import type { Viewer } from "./viewer";

const NOTE_LIST_LIMIT = 20;
export const RECENT_ENTRY_COUNT = 6;
const DAILY_KINDS: DailyKind[] = ["scripture", "romance", "love", "faith", "encouragement"];

export type HomeNote = {
  id: string;
  body: string;
  stamp: string;
  unread: boolean;
  reply: { body: string; stamp: string } | null;
};

export type HomeEntry = {
  id: string;
  title: string;
  entryDate: string;
  mood: Mood | null;
  category: EntryCategory;
  visibility: Visibility;
  author: { name: string; partner: PartnerKey };
};

export type HomeData = {
  partner: { userId: string; displayName: string; nickname: string; partner: PartnerKey };
  daily: Partial<Record<DailyKind, DailyItem>>;
  partnerLatest: { id: string; title: string; ago: string } | null;
  together: ReturnType<typeof togetherStats> | null;
  /** Licence line under the scripture card (Settings › Bible translation). */
  bibleNotice: string | null;
  received: { notes: HomeNote[]; total: number; unread: number };
  sent: { notes: HomeNote[]; total: number; answered: number };
  recent: HomeEntry[];
};

/** Everything Home needs, in parallel, as the signed-in partner (RLS applies to every query). */
export async function getHomeData(viewer: Viewer, now = new Date()): Promise<HomeData> {
  const supabase = await createClient();
  const tz = viewer.timezone;

  const [
    profilesRes,
    dailyRes,
    settingsRes,
    receivedRes,
    receivedUnreadRes,
    sentRes,
    answeredRes,
    recentRes,
  ] = await Promise.all([
    supabase.from("profiles").select("user_id, display_name, nickname, partner"),
    supabase
      .from("daily_content")
      .select("id, kind, text, attribution, reference, translation, active")
      .eq("active", true),
    supabase.from("settings").select("anniversary, bible_notice").maybeSingle(),
    supabase
      .from("notes")
      .select("id, body, created_at, read_at, reply_body, replied_at", { count: "exact" })
      .eq("to_id", viewer.userId)
      .order("created_at", { ascending: false })
      .limit(NOTE_LIST_LIMIT),
    supabase
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("to_id", viewer.userId)
      .is("read_at", null),
    supabase
      .from("notes")
      .select("id, body, created_at, read_at, reply_body, replied_at", { count: "exact" })
      .eq("from_id", viewer.userId)
      .order("created_at", { ascending: false })
      .limit(NOTE_LIST_LIMIT),
    supabase
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("from_id", viewer.userId)
      .not("replied_at", "is", null),
    supabase
      .from("entries")
      .select("id, title, entry_date, mood, category, visibility, author_id, created_at")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(RECENT_ENTRY_COUNT),
  ]);

  const profiles = profilesRes.data ?? [];
  const other = profiles.find((p) => p.user_id !== viewer.userId);
  const partner = other
    ? {
        userId: other.user_id,
        displayName: other.display_name,
        nickname: other.nickname,
        partner: other.partner,
      }
    : {
        userId: "",
        displayName: viewer.partner === "a" ? "Afeez" : "Nurat",
        nickname: viewer.partner === "a" ? "Kuleo" : "D_Gal",
        partner: (viewer.partner === "a" ? "b" : "a") as PartnerKey,
      };

  // Daily cards: same items for both partners — the day is taken in the shared time zone.
  const items = (dailyRes.data ?? []) as DailyItem[];
  const daily: HomeData["daily"] = {};
  for (const kind of DAILY_KINDS) {
    const pick = pickDaily(kind, now, items, SHARED_TIMEZONE);
    if (pick) daily[kind] = pick;
  }

  const anniversary = settingsRes.data?.anniversary ?? null;
  const together = anniversary ? togetherStats(anniversary, calendarDate(now, tz)) : null;

  const toNote = (row: {
    id: string;
    body: string;
    created_at: string;
    read_at: string | null;
    reply_body: string | null;
    replied_at: string | null;
  }): HomeNote => ({
    id: row.id,
    body: row.body,
    stamp: noteStamp(new Date(row.created_at), now, tz),
    unread: row.read_at === null,
    reply:
      row.reply_body && row.replied_at
        ? { body: row.reply_body, stamp: noteStamp(new Date(row.replied_at), now, tz) }
        : null,
  });

  const byUser = new Map(profiles.map((p) => [p.user_id, p]));
  const recentRows = recentRes.data ?? [];
  const recent: HomeEntry[] = recentRows.map((e) => {
    const author = byUser.get(e.author_id);
    return {
      id: e.id,
      title: e.title,
      entryDate: e.entry_date,
      mood: e.mood,
      category: e.category,
      visibility: e.visibility,
      author: author
        ? { name: author.display_name, partner: author.partner }
        : { name: "Unknown", partner: viewer.partner },
    };
  });

  // "{partner} wrote two hours ago — “title”": the partner's newest published entry, by when it was written.
  let partnerLatest: HomeData["partnerLatest"] = null;
  if (partner.userId) {
    const { data: latest } = await supabase
      .from("entries")
      .select("id, title, created_at")
      .eq("author_id", partner.userId)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest) {
      partnerLatest = {
        id: latest.id,
        title: latest.title,
        ago: formatDistanceStrict(new Date(latest.created_at), now, { addSuffix: true }),
      };
    }
  }

  return {
    partner,
    daily,
    partnerLatest,
    together,
    bibleNotice: settingsRes.data?.bible_notice ?? null,
    received: {
      notes: (receivedRes.data ?? []).map(toNote),
      total: receivedRes.count ?? 0,
      unread: receivedUnreadRes.count ?? 0,
    },
    sent: {
      notes: (sentRes.data ?? []).map(toNote),
      total: sentRes.count ?? 0,
      answered: answeredRes.count ?? 0,
    },
    recent,
  };
}
