import "server-only";

import { createElement } from "react";
import { render, toPlainText } from "@react-email/components";

import { DigestEmail } from "@/emails/digest-email";
import { homeDate, noteStamp } from "@/lib/dates";
import { describeNotification, parsePrefs, pickForDigest } from "@/lib/notifications";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";
import { emailConfigured, sendEmail, siteUrl } from "./mailer";
import { emailOf } from "./notify";

const LOOKBACK_DAYS = 7;

export type DigestReport = {
  recipients: number;
  emailsSent: number;
  notificationsEmailed: number;
  skipped?: string;
};

/**
 * The daily digest (PRD FR-41), run by Vercel Cron. For each partner: every unsent notification of a "daily" type
 * from the last 7 days (plus any "instant" one whose email failed), in one email; then marks them emailed.
 */
export async function runDigest(now = new Date()): Promise<DigestReport> {
  if (!emailConfigured())
    return { recipients: 0, emailsSent: 0, notificationsEmailed: 0, skipped: "email not configured" };
  const svc = createServiceClient();
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString();

  const [{ data: queue }, { data: profiles }] = await Promise.all([
    svc
      .from("notifications")
      .select("id, user_id, type, payload, created_at")
      .is("emailed_at", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000),
    svc.from("profiles").select("user_id, notify_prefs, timezone"),
  ]);
  const rows = queue ?? [];
  const prefs = new Map((profiles ?? []).map((p) => [p.user_id, parsePrefs(p.notify_prefs)]));
  const zones = new Map((profiles ?? []).map((p) => [p.user_id, p.timezone]));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const groups = pickForDigest(rows, prefs, now);

  const report: DigestReport = { recipients: groups.size, emailsSent: 0, notificationsEmailed: 0 };
  for (const [userId, picked] of groups) {
    const email = await emailOf(svc, userId);
    if (!email) continue;
    const tz = zones.get(userId) ?? "America/Toronto";
    const items = picked.map((n) => {
      const d = describeNotification(n.type, byId.get(n.id)!.payload as Json);
      return { line: d.emailLine, href: d.href, when: noteStamp(new Date(n.created_at), now, tz) };
    });
    const html = await render(
      createElement(DigestEmail, { items, siteUrl: siteUrl(), date: homeDate(now, tz) }),
    );
    const subject = `Your diary today: ${items.length} ${items.length === 1 ? "update" : "updates"}`;
    if (!(await sendEmail({ to: email, subject, html, text: toPlainText(html) }))) continue;
    await svc
      .from("notifications")
      .update({ emailed_at: now.toISOString() })
      .in(
        "id",
        picked.map((n) => n.id),
      )
      .is("emailed_at", null);
    report.emailsSent += 1;
    report.notificationsEmailed += picked.length;
  }
  return report;
}
