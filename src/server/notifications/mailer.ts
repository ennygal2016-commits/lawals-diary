import "server-only";

import { Resend } from "resend";

/** Is email set up? Without RESEND_API_KEY nothing is sent (local dev, tests) and notifications stay unsent. */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

let client: Resend | null = null;

/** Send one email through Resend. Returns true only when Resend accepted it. Never throws. */
export async function sendEmail(message: { to: string; subject: string; html: string; text: string }) {
  if (!emailConfigured()) return false;
  client ??= new Resend(process.env.RESEND_API_KEY);
  try {
    const { error } = await client.emails.send({
      from: process.env.EMAIL_FROM!,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: { "X-Entity-Ref-ID": crypto.randomUUID() }, // stop Gmail threading unrelated notifications
    });
    if (error) console.error("[email] Resend refused:", error.name);
    return !error;
  } catch (err) {
    console.error("[email] send failed:", err instanceof Error ? err.name : "unknown");
    return false;
  }
}
