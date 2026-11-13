"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { DocumentError, cleanDocument } from "@/lib/images/document";
import { createClient } from "@/lib/supabase/server";
import {
  DOC_MAX_BYTES,
  noteSchema,
  paymentSchema,
  statusChangeSchema,
  statusLabel,
} from "@/lib/validation/foundation";
import type { ApplicationStatus } from "@/types/database";
import { DOCS_BUCKET } from "@/server/queries/foundation";
import { removeFiles } from "@/server/photos/storage";

export type FoundationResult = { ok: true; message: string } | { ok: false; message: string };

const SIGNED_OUT: FoundationResult = { ok: false, message: "Your session has ended. Sign in again." };

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function refresh(id: string) {
  revalidatePath(`/admin/foundation/${id}`);
  revalidatePath("/admin/foundation");
}

/** setApplicationStatus (DESIGN.md §9): status + history entry in one transaction (set_application_status). */
export async function setApplicationStatus(input: {
  id: string;
  status: ApplicationStatus;
  note?: string;
}): Promise<FoundationResult> {
  const parsed = statusChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Choose a status." };
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;
  const { error } = await supabase.rpc("set_application_status", {
    p_id: parsed.data.id,
    p_status: parsed.data.status,
    p_note: parsed.data.note || null,
  });
  if (error) return { ok: false, message: "The status didn’t change. Try again." };
  refresh(parsed.data.id);
  return { ok: true, message: `Marked ${statusLabel(parsed.data.status)}.` };
}

/** addApplicationNote: a private note in the history (only the two admins can read it). */
export async function addApplicationNote(input: { id: string; note: string }): Promise<FoundationResult> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Write a note first." };
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;
  const { error } = await supabase
    .from("application_events")
    .insert({ application_id: parsed.data.id, actor_id: user.id, note: parsed.data.note });
  if (error) return { ok: false, message: "The note didn’t save. Try again." };
  refresh(parsed.data.id);
  return { ok: true, message: "Note added." };
}

/** recordPayment: amount, date and an optional receipt (PDF or photo, metadata stripped) for a Funded application. */
export async function recordPayment(formData: FormData): Promise<FoundationResult> {
  const parsed = paymentSchema.safeParse({
    id: formData.get("id"),
    amount: formData.get("amount"),
    paid_on: formData.get("paid_on"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the payment." };
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;

  let receiptPath: string | null = null;
  const file = formData.get("receipt");
  if (file instanceof File && file.size > 0) {
    if (file.size > DOC_MAX_BYTES) return { ok: false, message: "The receipt must be under 10 MB." };
    try {
      const doc = await cleanDocument(Buffer.from(await file.arrayBuffer()));
      receiptPath = `receipts/${parsed.data.id}/${randomUUID()}.${doc.ext}`;
      const { error } = await supabase.storage
        .from(DOCS_BUCKET)
        .upload(receiptPath, doc.buffer, { contentType: doc.mime });
      if (error) return { ok: false, message: "The receipt didn’t upload. Try again." };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof DocumentError ? err.message : "The receipt couldn’t be read.",
      };
    }
  }

  const { data: before } = await supabase
    .from("foundation_applications")
    .select("receipt_path")
    .eq("id", parsed.data.id)
    .maybeSingle();
  const { error } = await supabase.rpc("record_application_payment", {
    p_id: parsed.data.id,
    p_amount: parsed.data.amount,
    p_paid_on: parsed.data.paid_on,
    p_receipt_path: receiptPath,
  });
  if (error) {
    if (receiptPath) await removeFiles(supabase, DOCS_BUCKET, [receiptPath]);
    return {
      ok: false,
      message: error.message.includes("Funded")
        ? "Mark it Funded first."
        : "The payment didn’t save. Try again.",
    };
  }
  // A new receipt replaces the old file.
  if (receiptPath && before?.receipt_path) await removeFiles(supabase, DOCS_BUCKET, [before.receipt_path]);
  refresh(parsed.data.id);
  return { ok: true, message: "Payment recorded." };
}
