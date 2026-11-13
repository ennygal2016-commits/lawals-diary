import { z } from "zod";

export const NOTE_MAX = 1000;

/** PRD FR-8: a note (and its one reply) is 1–1,000 characters. */
export const noteBodySchema = z
  .string()
  .trim()
  .min(1, { error: "Write something first." })
  .max(NOTE_MAX, { error: `Keep it to ${NOTE_MAX.toLocaleString("en-CA")} characters or fewer.` });

export const sendNoteSchema = z.object({ body: noteBodySchema });
export type SendNoteInput = z.infer<typeof sendNoteSchema>;

export const replyNoteSchema = z.object({ noteId: z.uuid(), body: noteBodySchema });
export type ReplyNoteInput = z.infer<typeof replyNoteSchema>;

export const markNotesReadSchema = z.object({ noteIds: z.array(z.uuid()).min(1).max(100) });
