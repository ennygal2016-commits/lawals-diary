import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { NOTE_MAX, markNotesReadSchema, replyNoteSchema, sendNoteSchema } from "@/lib/validation/notes";

describe("note validation (PRD FR-8)", () => {
  it("accepts 1–1,000 characters after trimming", () => {
    expect(sendNoteSchema.parse({ body: "  hi  " }).body).toBe("hi");
    expect(sendNoteSchema.safeParse({ body: "x".repeat(NOTE_MAX) }).success).toBe(true);
    expect(sendNoteSchema.safeParse({ body: "x".repeat(NOTE_MAX + 1) }).success).toBe(false);
    expect(sendNoteSchema.safeParse({ body: "   " }).success).toBe(false);
  });

  it("replies need a real note id", () => {
    expect(replyNoteSchema.safeParse({ noteId: "not-a-uuid", body: "ok" }).success).toBe(false);
    expect(
      replyNoteSchema.safeParse({ noteId: "3f0c2b9e-4b7a-4c1e-9a55-0d6f1b2c3d4e", body: "ok" }).success,
    ).toBe(true);
  });

  it("mark-read takes 1–100 ids", () => {
    expect(markNotesReadSchema.safeParse({ noteIds: [] }).success).toBe(false);
    expect(markNotesReadSchema.safeParse({ noteIds: ["nope"] }).success).toBe(false);
  });

  it("the database also limits notes and replies to 1,000 characters and guards replies", () => {
    const schema = readFileSync("supabase/migrations/20261111000001_schema.sql", "utf8");
    expect(schema).toContain("body text not null check (char_length(body) between 1 and 1000)");
    expect(schema).toContain("reply_body text check (char_length(reply_body) between 1 and 1000)");
    const guard = readFileSync("supabase/migrations/20261111000004_notes_guard.sql", "utf8");
    expect(guard).toMatch(/uid <> old\.to_id or old\.reply_body is not null/);
    expect(guard).toContain("before update on public.notes");
  });
});
