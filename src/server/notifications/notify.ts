import "server-only";

import { createElement } from "react";
import { after } from "next/server";
import { render, toPlainText } from "@react-email/components";
import type { SupabaseClient } from "@supabase/supabase-js";

import { NotificationEmail } from "@/emails/notification-email";
import { type NotificationType, describeNotification, parsePrefs } from "@/lib/notifications";
import { supabaseEnv } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database, Json } from "@/types/database";
import { emailConfigured, sendEmail, siteUrl } from "./mailer";

type Client = SupabaseClient<Database>;

/**
 * Write a notification row for the other partner (PRD FR-40) as the signed-in actor (RLS allows admins to notify),
 * then — after the response has gone out — email it if the partner chose "instant" for this type.
 * Never throws: a missed notification must not fail the action that caused it.
 */
export async function notifyPartner(
  supabase: Client,
  actorId: string,
  type: Exclude<NotificationType, "application">,
  payload: Record<string, string>,
): Promise<void> {
  try {
    const { data: profiles } = await supabase.from("profiles").select("user_id, nickname");
    const me = profiles?.find((p) => p.user_id === actorId);
    const partner = profiles?.find((p) => p.user_id !== actorId);
    if (!partner) return;
    const { data } = await supabase
      .from("notifications")
      .insert({ user_id: partner.user_id, type, payload: { ...payload, from: me?.nickname ?? "" } })
      .select("id")
      .single();
    if (data) after(() => deliverInstant([data.id]));
  } catch (err) {
    console.error("[notify] failed:", err instanceof Error ? err.message : err);
  }
}

/**
 * Email the given notifications to their recipients if their preference for that type is "instant", and mark them
 * emailed. Uses the service role (needs the recipients' auth emails). Safe to call twice — already-emailed rows are
 * skipped. Content-free emails: see NotificationEmail.
 */
export async function deliverInstant(ids: string[]): Promise<number> {
  if (!ids.length || !emailConfigured() || !supabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return 0;
  const svc = createServiceClient();

  const { data: rows } = await svc
    .from("notifications")
    .select("id, user_id, type, payload")
    .in("id", ids)
    .is("emailed_at", null);
  if (!rows?.length) return 0;

  const { data: profiles } = await svc
    .from("profiles")
    .select("user_id, notify_prefs")
    .in(
      "user_id",
      rows.map((r) => r.user_id),
    );
  const prefs = new Map((profiles ?? []).map((p) => [p.user_id, parsePrefs(p.notify_prefs)]));

  let sent = 0;
  for (const row of rows) {
    if ((prefs.get(row.user_id) ?? parsePrefs(null))[row.type] !== "instant") continue;
    const email = await emailOf(svc, row.user_id);
    if (!email) continue;
    const d = describeNotification(row.type, row.payload as Json);
    const html = await render(
      createElement(NotificationEmail, { line: d.emailLine, href: d.href, siteUrl: siteUrl() }),
    );
    const ok = await sendEmail({ to: email, subject: d.emailLine, html, text: toPlainText(html) });
    if (ok) {
      await svc
        .from("notifications")
        .update({ emailed_at: new Date().toISOString() })
        .eq("id", row.id)
        .is("emailed_at", null);
      sent += 1;
    }
  }
  return sent;
}

const emailCache = new Map<string, string | null>();

export async function emailOf(svc: Client, userId: string): Promise<string | null> {
  if (emailCache.has(userId)) return emailCache.get(userId)!;
  const { data } = await svc.auth.admin.getUserById(userId);
  const email = data.user?.email ?? null;
  emailCache.set(userId, email);
  return email;
}
