import { describe, expect, it } from "vitest";

import { bookSchema, isOpenLibraryCover, normalizeIsbn, parseOpenLibrary, quoteSchema } from "@/lib/books";

describe("normalizeIsbn", () => {
  it("accepts valid ISBN-10 and ISBN-13 with spaces or hyphens", () => {
    expect(normalizeIsbn("0-306-40615-2")).toBe("0306406152");
    expect(normalizeIsbn("978 0 306 40615 7")).toBe("9780306406157");
    expect(normalizeIsbn("080442957x")).toBe("080442957X");
  });
  it("rejects bad checksums and junk", () => {
    expect(normalizeIsbn("0306406153")).toBeNull();
    expect(normalizeIsbn("9780306406158")).toBeNull();
    expect(normalizeIsbn("hello")).toBeNull();
    expect(normalizeIsbn("")).toBeNull();
  });
});

describe("parseOpenLibrary", () => {
  const isbn = "9780140449136";
  const sample = {
    [`ISBN:${isbn}`]: {
      title: "Crime and Punishment",
      authors: [{ name: "Fyodor Dostoyevsky" }, { name: "David McDuff" }],
      cover: {
        small: "https://covers.openlibrary.org/b/id/1-S.jpg",
        medium: "https://covers.openlibrary.org/b/id/1-M.jpg",
        large: "https://covers.openlibrary.org/b/id/1-L.jpg",
      },
      publish_date: "2003",
    },
  };

  it("reads title, authors, the large cover and date", () => {
    expect(parseOpenLibrary(sample, isbn)).toEqual({
      title: "Crime and Punishment",
      author: "Fyodor Dostoyevsky, David McDuff",
      coverUrl: "https://covers.openlibrary.org/b/id/1-L.jpg",
      published: "2003",
    });
  });

  it("returns null for unknown ISBNs and ignores covers from other hosts", () => {
    expect(parseOpenLibrary({}, isbn)).toBeNull();
    expect(parseOpenLibrary(null, isbn)).toBeNull();
    const evil = { [`ISBN:${isbn}`]: { title: "X", cover: { large: "http://169.254.169.254/latest" } } };
    expect(parseOpenLibrary(evil, isbn)?.coverUrl).toBeNull();
    expect(isOpenLibraryCover("https://covers.openlibrary.org.evil.example/a.jpg")).toBe(false);
  });
});

describe("book and quote validation", () => {
  const base = { title: "Things Fall Apart", status: "reading", readers: [] };
  it("normalises the ISBN and empty fields", () => {
    const b = bookSchema.parse({ ...base, isbn: "978-0-306-40615-7", author: "", notes: "  " });
    expect(b).toMatchObject({
      isbn: "9780306406157",
      author: null,
      notes: null,
      rating: null,
      started_on: null,
    });
  });
  it("rejects bad ISBNs, ratings out of range and reversed dates", () => {
    expect(bookSchema.safeParse({ ...base, isbn: "12345" }).success).toBe(false);
    expect(bookSchema.safeParse({ ...base, rating: 6 }).success).toBe(false);
    expect(
      bookSchema.safeParse({ ...base, started_on: "2026-05-01", finished_on: "2026-04-01" }).success,
    ).toBe(false);
    expect(bookSchema.safeParse({ ...base, readers: ["a", "b"] }).success).toBe(false);
  });
  it("quotes need text; page is optional", () => {
    const id = "3f0c2b9e-4b7a-4c1e-9a55-0d6f1b2c3d4e";
    expect(quoteSchema.parse({ bookId: id, text: " Hope ", page: "" })).toEqual({
      bookId: id,
      text: "Hope",
      page: null,
    });
    expect(quoteSchema.safeParse({ bookId: id, text: " " }).success).toBe(false);
  });
});
