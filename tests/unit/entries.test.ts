import { describe, expect, it } from "vitest";

import { EMPTY_DOC } from "@/lib/rich-text";
import {
  autosaveSchema,
  commentSchema,
  isValidIsoDate,
  latestEntryDate,
  saveEntrySchema,
  slugFor,
} from "@/lib/validation/entry";

const base = {
  title: "Rain on the train home",
  entry_date: "2026-11-03",
  location: "",
  mood: null,
  category: "everyday",
  visibility: "private",
  body_json: EMPTY_DOC,
  photo_ids: [],
};

describe("entry validation (PRD FR-13)", () => {
  it("accepts a full entry and trims text", () => {
    const parsed = saveEntrySchema.parse({ ...base, title: "  Lake  ", location: " Toronto " });
    expect(parsed.title).toBe("Lake");
    expect(parsed.location).toBe("Toronto");
  });

  it("requires a title to save, but not to autosave", () => {
    expect(saveEntrySchema.safeParse({ ...base, title: "  " }).success).toBe(false);
    expect(autosaveSchema.safeParse({ ...base, title: "" }).success).toBe(true);
  });

  it("limits title to 120 and location to 200 characters", () => {
    expect(saveEntrySchema.safeParse({ ...base, title: "x".repeat(121) }).success).toBe(false);
    expect(saveEntrySchema.safeParse({ ...base, location: "x".repeat(201) }).success).toBe(false);
  });

  it("only accepts the listed moods and categories", () => {
    expect(saveEntrySchema.safeParse({ ...base, mood: "loved" }).success).toBe(true);
    expect(saveEntrySchema.safeParse({ ...base, mood: "angry" }).success).toBe(false);
    expect(saveEntrySchema.safeParse({ ...base, category: "date_night" }).success).toBe(true);
    expect(saveEntrySchema.safeParse({ ...base, category: "work" }).success).toBe(false);
    expect(saveEntrySchema.safeParse({ ...base, visibility: "friends" }).success).toBe(false);
  });

  it("allows any past date, today, but not the future or nonsense", () => {
    expect(saveEntrySchema.safeParse({ ...base, entry_date: "1999-12-31" }).success).toBe(true);
    expect(saveEntrySchema.safeParse({ ...base, entry_date: latestEntryDate() }).success).toBe(true);
    expect(saveEntrySchema.safeParse({ ...base, entry_date: "2999-01-01" }).success).toBe(false);
    expect(saveEntrySchema.safeParse({ ...base, entry_date: "2026-02-30" }).success).toBe(false);
    expect(saveEntrySchema.safeParse({ ...base, entry_date: "03/11/2026" }).success).toBe(false);
    expect(isValidIsoDate("2024-02-29")).toBe(true);
    expect(isValidIsoDate("2026-02-29")).toBe(false);
  });

  it("takes 0–20 unique photo ids", () => {
    const id = (n: number) => `3f0c2b9e-4b7a-4c1e-9a55-${String(n).padStart(12, "0")}`;
    expect(
      saveEntrySchema.safeParse({ ...base, photo_ids: Array.from({ length: 20 }, (_, i) => id(i)) }).success,
    ).toBe(true);
    expect(
      saveEntrySchema.safeParse({ ...base, photo_ids: Array.from({ length: 21 }, (_, i) => id(i)) }).success,
    ).toBe(false);
    expect(saveEntrySchema.safeParse({ ...base, photo_ids: [id(1), id(1)] }).success).toBe(false);
    expect(saveEntrySchema.safeParse({ ...base, photo_ids: ["not-a-uuid"] }).success).toBe(false);
  });

  it("comments are 1–2,000 characters", () => {
    const entryId = "3f0c2b9e-4b7a-4c1e-9a55-0d6f1b2c3d4e";
    expect(commentSchema.safeParse({ entryId, body: " ok " }).success).toBe(true);
    expect(commentSchema.safeParse({ entryId, body: "  " }).success).toBe(false);
    expect(commentSchema.safeParse({ entryId, body: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("slugFor", () => {
  const id = "3f0c2b9e-4b7a-4c1e-9a55-0d6f1b2c3d4e";
  it("makes a readable, unique, DB-valid slug", () => {
    expect(slugFor("Rain on the train home", id)).toBe("rain-on-the-train-home-3f0c2b");
    expect(slugFor("Crème brûlée — attempt #3!", id)).toBe("creme-brulee-attempt-3-3f0c2b");
    expect(slugFor("🎉🎉", id)).toBe("3f0c2b");
    for (const title of ["  --A--  ", "x".repeat(200), "Ọjọ́ ìbí"]) {
      expect(slugFor(title, id)).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});
