import { randomUUID } from "node:crypto";
import { createElement } from "react";
import { NextResponse, after, type NextRequest } from "next/server";
import { render, toPlainText } from "@react-email/components";

import { ApplicationReceivedEmail } from "@/emails/application-received-email";
import { type CleanDocument, DocumentError, cleanDocument } from "@/lib/images/document";
import { calendarDate } from "@/lib/dates";
import { SHARED_TIMEZONE } from "@/lib/site";
import { supabaseEnv } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/service";
import { DOCS_MAX, DOC_MAX_BYTES, applicationSchema } from "@/lib/validation/foundation";
import { sendEmail, siteUrl } from "@/server/notifications/mailer";
import { deliverInstant } from "@/server/notifications/notify";
import { clientIp, limitFoundationApplication } from "@/server/rate-limit";
import { isPublicSiteOn } from "@/server/queries/public";
import { verifyTurnstile } from "@/server/turnstile";
import { isSameOrigin } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const DOCS_BUCKET = "foundation-docs";
const FIELDS = [
  "applicant_name",
  "applicant_dob",
  "applicant_phone",
  "applicant_email",
  "guardian_name",
  "guardian_relationship",
  "guardian_phone",
  "guardian_email",
  "school",
  "level",
  "class_year",
  "amount_requested",
  "reason",
  "consent_data",
  "consent_contact",
  "website",
] as const;

export type ApplyResponse =
  { ok: true; reference: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const fail = (error: string, status: number, fieldErrors?: Record<string, string>) =>
  NextResponse.json({ ok: false, error, fieldErrors } satisfies ApplyResponse, { status });

/**
 * POST /api/foundation/apply — submitApplication (DESIGN.md §9, PRD FR-32/33). Public, no account.
 * Order: same-site → rate limit (5/IP/hour) → Turnstile → validation → documents cleaned in memory → only then is
 * anything stored, with the service role (applicants can never read anything back). A database trigger notifies both
 * admins; the confirmation email and instant admin emails go out after the response.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers)) return fail("Forbidden", 403);

  const ip = clientIp(request.headers);
  const limit = await limitFoundationApplication(ip);
  if (!limit.success) {
    return fail("Too many applications from this connection. Please try again in an hour.", 429);
  }

  if (supabaseEnv() && !(await isPublicSiteOn())) {
    return fail("Applications are closed while the site is offline. Please try again later.", 503);
  }

  if (!supabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return fail("Applications can’t be received right now. Please try again later.", 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("That didn’t come through. Please try again.", 400);
  }

  const human = await verifyTurnstile(form.get("cf-turnstile-response")?.toString() ?? null, ip);
  if (!human.ok) return fail("Please complete the check above the Submit button, then try again.", 400);

  const fields: Record<string, string> = {};
  for (const key of FIELDS) {
    const v = form.get(key);
    if (typeof v === "string") fields[key] = v;
  }
  const parsed = applicationSchema(calendarDate(new Date(), SHARED_TIMEZONE)).safeParse(fields);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return fail("Please check the highlighted fields.", 400, fieldErrors);
  }
  const data = parsed.data;

  const files = form.getAll("documents").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > DOCS_MAX) {
    return fail("Please check the documents.", 400, { documents: `Up to ${DOCS_MAX} files.` });
  }
  let docs: CleanDocument[];
  try {
    docs = await Promise.all(
      files.map(async (file) => {
        if (file.size > DOC_MAX_BYTES) throw new DocumentError(`“${file.name}” is over 10 MB.`);
        try {
          return await cleanDocument(Buffer.from(await file.arrayBuffer()));
        } catch (err) {
          throw err instanceof DocumentError ? new DocumentError(`“${file.name}”: ${err.message}`) : err;
        }
      }),
    );
  } catch (err) {
    return fail("Please check the documents.", 400, {
      documents: err instanceof DocumentError ? err.message : "One of the files couldn’t be read.",
    });
  }

  const svc = createServiceClient();
  const { data: reference, error: refError } = await svc.rpc("next_foundation_reference");
  if (refError || !reference) return fail("Something went wrong on our side. Please try again.", 500);

  const { data: app, error: insertError } = await svc
    .from("foundation_applications")
    .insert({
      reference,
      applicant_name: data.applicant_name,
      applicant_dob: data.applicant_dob,
      applicant_phone: data.applicant_phone ?? null,
      applicant_email: data.applicant_email ?? null,
      guardian_name: data.guardian_name ?? null,
      guardian_relationship: data.guardian_relationship ?? null,
      guardian_phone: data.guardian_phone ?? null,
      guardian_email: data.guardian_email ?? null,
      school: data.school,
      level: data.level,
      class_year: data.class_year,
      amount_requested: data.amount_requested,
      reason: data.reason,
      consent_data: data.consent_data,
      consent_contact: data.consent_contact,
    })
    .select("id")
    .single();
  if (insertError || !app) return fail("Something went wrong on our side. Please try again.", 500);

  const uploaded: string[] = [];
  try {
    for (const doc of docs) {
      const path = `applications/${app.id}/${randomUUID()}.${doc.ext}`;
      const { error } = await svc.storage
        .from(DOCS_BUCKET)
        .upload(path, doc.buffer, { contentType: doc.mime });
      if (error) throw new Error(error.message);
      uploaded.push(path);
      const { error: rowError } = await svc
        .from("application_documents")
        .insert({ application_id: app.id, storage_path: path, mime: doc.mime, size: doc.buffer.byteLength });
      if (rowError) throw new Error(rowError.message);
    }
  } catch {
    // Roll back: nothing half-saved, and the admins aren't told about an application that doesn't exist.
    if (uploaded.length) await svc.storage.from(DOCS_BUCKET).remove(uploaded);
    await svc.from("notifications").delete().eq("type", "application").eq("payload->>application_id", app.id);
    await svc.from("foundation_applications").delete().eq("id", app.id);
    return fail("Your documents couldn’t be saved. Please try again.", 500);
  }

  await svc
    .from("application_events")
    .insert({ application_id: app.id, to_status: "new", note: "Submitted through the public form" });

  const recipients = [
    ...new Set([data.applicant_email, data.guardian_email].filter((e): e is string => !!e)),
  ];
  after(async () => {
    const { data: notes } = await svc
      .from("notifications")
      .select("id")
      .eq("type", "application")
      .eq("payload->>application_id", app.id);
    await deliverInstant((notes ?? []).map((n) => n.id));
    const html = await render(createElement(ApplicationReceivedEmail, { reference, siteUrl: siteUrl() }));
    for (const to of recipients) {
      await sendEmail({
        to,
        subject: `We received your application ${reference}`,
        html,
        text: toPlainText(html),
      });
    }
  });

  return NextResponse.json({ ok: true, reference } satisfies ApplyResponse);
}
