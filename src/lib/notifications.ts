import type { Json, NotificationRow } from "@/types/database";

/**
 * Notifications (PRD FR-40/41): types, per-type email preferences and how each one reads. Pure — used by the bell
 * (client), the server actions, the emails and the digest.
 */
export const NOTIFICATION_TYPES = ["entry", "comment", "note", "note_reply", "application"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, { label: string; hint: string }> = {
  entry: { label: "New entries", hint: "When your partner saves a new entry." },
  comment: { label: "Comments", hint: "When your partner comments on an entry." },
  note: { label: "Notes", hint: "When your partner leaves you a note." },
  note_reply: { label: "Note replies", hint: "When your partner replies to your note." },
  application: { label: "Foundation applications", hint: "When someone applies to the foundation." },
};

export const EMAIL_MODES = ["instant", "daily", "off"] as const;
export type EmailMode = (typeof EMAIL_MODES)[number];
export const EMAIL_MODE_LABELS: Record<EmailMode, string> = {
  instant: "Instant",
  daily: "Daily digest",
  off: "Off",
};

export type NotifyPrefs = Record<NotificationType, EmailMode>;

/** Defaults until a partner changes them in Settings. */
export const DEFAULT_PREFS: NotifyPrefs = {
  entry: "daily",
  comment: "daily",
  note: "instant",
  note_reply: "instant",
  application: "instant",
};

/** profiles.notify_prefs → full preferences; unknown or missing values fall back to the defaults. */
export function parsePrefs(json: Json | null | undefined): NotifyPrefs {
  const raw =
    json && typeof json === "object" && !Array.isArray(json) ? (json as Record<string, unknown>) : {};
  const out = { ...DEFAULT_PREFS };
  for (const type of NOTIFICATION_TYPES) {
    const v = raw[type];
    if (typeof v === "string" && (EMAIL_MODES as readonly string[]).includes(v)) out[type] = v as EmailMode;
  }
  return out;
}

type Payload = Record<string, unknown>;

function str(payload: Payload, key: string): string | undefined {
  const v = payload[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function payloadOf(json: Json): Payload {
  return json && typeof json === "object" && !Array.isArray(json) ? (json as Payload) : {};
}

export type DescribedNotification = {
  /** One line for the bell: "D_Gal wrote “Rain on the train home”". */
  text: string;
  /** Short private excerpt (bell only — never emailed). */
  excerpt?: string;
  href: string;
  /** Email subject / digest line — never contains entry, note or comment text. */
  emailLine: string;
};

/** How a notification reads. Names come from the payload's `from` nickname; never pronouns. */
export function describeNotification(type: NotificationType, json: Json): DescribedNotification {
  const p = payloadOf(json);
  const from = str(p, "from") ?? "Your partner";
  const title = str(p, "title");
  const entryHref = str(p, "entry_id") ? `/admin/entries/${str(p, "entry_id")}` : "/admin/timeline";
  switch (type) {
    case "entry":
      return {
        text: title ? `${from} wrote “${title}”` : `${from} wrote a new entry`,
        href: entryHref,
        emailLine: `${from} wrote a new entry`,
      };
    case "comment":
      return {
        text: title ? `${from} commented on “${title}”` : `${from} commented on an entry`,
        excerpt: str(p, "excerpt"),
        href: `${entryHref}#comments-heading`,
        emailLine: `${from} commented on an entry`,
      };
    case "note":
      return {
        text: `${from} left you a note`,
        excerpt: str(p, "excerpt"),
        href: "/admin#note-composer-heading",
        emailLine: `${from} left you a note`,
      };
    case "note_reply":
      return {
        text: `${from} replied to your note`,
        excerpt: str(p, "excerpt"),
        href: "/admin#note-composer-heading",
        emailLine: `${from} replied to your note`,
      };
    case "application": {
      const ref = str(p, "reference");
      const id = str(p, "application_id");
      return {
        text: ref ? `New foundation application ${ref}` : "New foundation application",
        href: id ? `/admin/foundation/${id}` : "/admin/foundation",
        emailLine: ref ? `New foundation application ${ref}` : "New foundation application",
      };
    }
  }
}

/** Short excerpt for the bell: one line, at most `max` characters. */
export function excerptOf(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

export type QueuedNotification = Pick<NotificationRow, "id" | "user_id" | "type" | "created_at">;

/**
 * Which unsent notifications go into today's digest, per recipient:
 * - "daily" ones, and
 * - "instant" ones whose instant email failed (still unsent after `graceMinutes`).
 * "off" ones are never emailed.
 */
export function pickForDigest(
  queue: QueuedNotification[],
  prefsByUser: Map<string, NotifyPrefs>,
  now: Date,
  graceMinutes = 15,
): Map<string, QueuedNotification[]> {
  const cutoff = now.getTime() - graceMinutes * 60_000;
  const out = new Map<string, QueuedNotification[]>();
  for (const n of queue) {
    const mode = (prefsByUser.get(n.user_id) ?? DEFAULT_PREFS)[n.type];
    const take = mode === "daily" || (mode === "instant" && new Date(n.created_at).getTime() < cutoff);
    if (!take) continue;
    const list = out.get(n.user_id) ?? [];
    list.push(n);
    out.set(n.user_id, list);
  }
  return out;
}
