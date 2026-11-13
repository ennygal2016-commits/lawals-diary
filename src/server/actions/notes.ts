"use server";

import { revalidatePath } from "next/cache";

import { excerptOf } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { notifyPartner } from "@/server/notifications/notify";
import {
  type ReplyNoteInput,
  type SendNoteInput,
  markNotesReadSchema,
  replyNoteSchema,
  sendNoteSchema,
} from "@/lib/validation/notes";

export type NoteActionResult = { ok: true; message: string } | { ok: false; message: string };

const SIGNED_OUT: NoteActionResult = { ok: false, message: "Your session has ended. Sign in again." };
const FAILED: NoteActionResult = { ok: false, message: "That didn’t send. Try again in a moment." };

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** sendNote (DESIGN.md §9): to the other partner, who gets an in-app notification (bell UI in Phase 9). */
export async function sendNote(input: SendNoteInput): Promise<NoteActionResult> {
  const parsed = sendNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the note." };

  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;

  const { data: profiles } = await supabase.from("profiles").select("user_id, nickname");
  const me = profiles?.find((p) => p.user_id === user.id);
  const partner = profiles?.find((p) => p.user_id !== user.id);
  if (!me || !partner) return FAILED;

  const { data: note, error } = await supabase
    .from("notes")
    .insert({ from_id: user.id, to_id: partner.user_id, body: parsed.data.body })
    .select("id")
    .single();
  if (error || !note) return FAILED;

  // Never fails the note itself; emails it if the partner chose "instant".
  await notifyPartner(supabase, user.id, "note", { note_id: note.id, excerpt: excerptOf(parsed.data.body) });

  revalidatePath("/admin");
  return { ok: true, message: `Note sent to ${partner.nickname}.` };
}

/** replyNote: only the recipient, only once (also enforced by the guard_note_update trigger). */
export async function replyNote(input: ReplyNoteInput): Promise<NoteActionResult> {
  const parsed = replyNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the reply." };

  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("notes")
    .update({ reply_body: parsed.data.body, replied_at: now, read_at: now })
    .eq("id", parsed.data.noteId)
    .eq("to_id", user.id)
    .is("reply_body", null)
    .select("id, from_id")
    .maybeSingle();
  if (error) return FAILED;
  if (!updated) return { ok: false, message: "This note already has a reply." };

  await notifyPartner(supabase, user.id, "note_reply", {
    note_id: updated.id,
    excerpt: excerptOf(parsed.data.body),
  });

  revalidatePath("/admin");
  return { ok: true, message: "Reply sent." };
}

/** markNoteRead: the recipient opened the list. Silent — nothing to tell the user. */
export async function markNotesRead(noteIds: string[]): Promise<void> {
  const parsed = markNotesReadSchema.safeParse({ noteIds });
  if (!parsed.success) return;

  const { supabase, user } = await signedIn();
  if (!user) return;

  await supabase
    .from("notes")
    .update({ read_at: new Date().toISOString() })
    .in("id", parsed.data.noteIds)
    .eq("to_id", user.id)
    .is("read_at", null);
}
