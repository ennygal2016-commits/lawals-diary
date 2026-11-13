"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import {
  type OpenLibraryBook,
  bookSchema,
  isOpenLibraryCover,
  normalizeIsbn,
  parseOpenLibrary,
  quoteSchema,
} from "@/lib/books";
import { COVER_MAX_BYTES, processCover } from "@/lib/images/cover";
import { PhotoError } from "@/lib/images/photo";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/server/queries/photos";
import { removeFiles } from "@/server/photos/storage";

export type BookResult = { ok: true; message: string; id?: string } | { ok: false; message: string };
const SIGNED_OUT: BookResult = { ok: false, message: "Your session has ended. Sign in again." };

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Add a book by ISBN (PRD FR-37): Open Library's data API. Neutral failure → the form falls back to manual entry. */
export async function lookupIsbn(
  raw: string,
): Promise<{ ok: true; isbn: string; book: OpenLibraryBook } | { ok: false; message: string }> {
  const isbn = normalizeIsbn(String(raw ?? ""));
  if (!isbn) return { ok: false, message: "That ISBN doesn’t look right — check the digits." };
  const { user } = await signedIn();
  if (!user) return { ok: false, message: "Your session has ended. Sign in again." };
  try {
    const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`, {
      headers: { "User-Agent": "LawalsDiary/1.0 (private family diary)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const book = parseOpenLibrary(await res.json(), isbn);
    return book
      ? { ok: true, isbn, book }
      : { ok: false, message: "Open Library doesn’t know that ISBN. Fill in the details yourself." };
  } catch {
    return { ok: false, message: "Open Library didn’t answer. Fill in the details yourself." };
  }
}

function fieldsOf(form: FormData) {
  const s = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : undefined;
  };
  return {
    title: s("title") ?? "",
    author: s("author"),
    isbn: s("isbn"),
    status: s("status") ?? "want_to_read",
    readers: form.getAll("readers").filter((v): v is string => typeof v === "string"),
    started_on: s("started_on"),
    finished_on: s("finished_on"),
    rating: s("rating") ? Number(s("rating")) : null,
    notes: s("notes"),
  };
}

/** Upload a cover from a file or (only) from covers.openlibrary.org; returns the storage path. */
async function storeCover(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookId: string,
  form: FormData,
): Promise<string | null> {
  const file = form.get("cover");
  let bytes: Buffer | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > COVER_MAX_BYTES) throw new PhotoError("Covers can be up to 10 MB.");
    bytes = Buffer.from(await file.arrayBuffer());
  } else {
    const url = form.get("cover_url");
    if (typeof url === "string" && url && isOpenLibraryCover(url)) {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: "follow" });
      // Open Library redirects to its archive mirrors; only accept image responses of sane size.
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && type.startsWith("image/")) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength > 1000 && buf.byteLength <= COVER_MAX_BYTES) bytes = buf;
      }
    }
  }
  if (!bytes) return null;
  const webp = await processCover(bytes);
  const path = `books/${bookId}/${randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, webp, { contentType: "image/webp", upsert: false });
  if (error) throw new Error("upload failed");
  return path;
}

/** upsertBook (DESIGN.md §9) — create. */
export async function createBook(form: FormData): Promise<BookResult> {
  const parsed = bookSchema.safeParse(fieldsOf(form));
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the book details." };
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;

  const { data, error } = await supabase.from("books").insert(parsed.data).select("id").single();
  if (error || !data) return { ok: false, message: "That book didn’t save. Try again." };
  try {
    const cover = await storeCover(supabase, data.id, form);
    if (cover) await supabase.from("books").update({ cover_path: cover }).eq("id", data.id);
  } catch (err) {
    revalidatePath("/admin/bookshelf");
    return {
      ok: true,
      id: data.id,
      message:
        err instanceof PhotoError
          ? `Book added, but the cover failed: ${err.message}`
          : "Book added (no cover).",
    };
  }
  revalidatePath("/admin/bookshelf");
  return { ok: true, id: data.id, message: "Book added to the shelf." };
}

/** upsertBook — update (and optionally replace the cover). */
export async function updateBook(form: FormData): Promise<BookResult> {
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "That book doesn’t exist." };
  const parsed = bookSchema.safeParse(fieldsOf(form));
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the book details." };
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;

  const { data: before } = await supabase.from("books").select("cover_path").eq("id", id).maybeSingle();
  if (!before) return { ok: false, message: "That book doesn’t exist." };
  let cover: string | null = null;
  try {
    cover = await storeCover(supabase, id, form);
  } catch (err) {
    return { ok: false, message: err instanceof PhotoError ? err.message : "The cover didn’t upload." };
  }
  const { error } = await supabase
    .from("books")
    .update({ ...parsed.data, ...(cover ? { cover_path: cover } : {}) })
    .eq("id", id);
  if (error) return { ok: false, message: "That didn’t save. Try again." };
  if (cover && before.cover_path) await removeFiles(supabase, PHOTO_BUCKET, [before.cover_path]);
  revalidatePath("/admin/bookshelf");
  revalidatePath(`/admin/bookshelf/${id}`);
  return { ok: true, id, message: "Saved." };
}

export async function deleteBook(id: string): Promise<BookResult> {
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;
  const { data } = await supabase.from("books").select("cover_path").eq("id", id).maybeSingle();
  if (!data) return { ok: false, message: "That book doesn’t exist." };
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) return { ok: false, message: "Couldn’t remove that book." };
  if (data.cover_path) await removeFiles(supabase, PHOTO_BUCKET, [data.cover_path]);
  revalidatePath("/admin/bookshelf");
  return { ok: true, message: "Book removed from the shelf." };
}

/** addQuote (DESIGN.md §9). */
export async function addQuote(input: { bookId: string; text: string; page?: string }): Promise<BookResult> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Write the quote." };
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;
  const { error } = await supabase.from("book_quotes").insert({
    book_id: parsed.data.bookId,
    text: parsed.data.text,
    page: parsed.data.page,
    added_by: user.id,
  });
  if (error) return { ok: false, message: "That quote didn’t save." };
  revalidatePath(`/admin/bookshelf/${parsed.data.bookId}`);
  return { ok: true, message: "Quote added." };
}

export async function deleteQuote(id: string): Promise<BookResult> {
  const { supabase, user } = await signedIn();
  if (!user) return SIGNED_OUT;
  const { data, error } = await supabase
    .from("book_quotes")
    .delete()
    .eq("id", id)
    .eq("added_by", user.id)
    .select("book_id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "Only the person who added a quote can remove it." };
  revalidatePath(`/admin/bookshelf/${data.book_id}`);
  return { ok: true, message: "Quote removed." };
}
