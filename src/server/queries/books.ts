import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BookStatus, PartnerKey } from "@/types/database";
import { signPaths } from "./photos";

export type Reader = { userId: string; name: string; partner: PartnerKey };

export type ShelfBook = {
  id: string;
  title: string;
  author: string | null;
  status: BookStatus;
  coverUrl: string | null;
  readers: Reader[];
  rating: number | null;
};

export type BookDetail = ShelfBook & {
  isbn: string | null;
  startedOn: string | null;
  finishedOn: string | null;
  notes: string | null;
  quotes: Array<{ id: string; text: string; page: string | null; addedBy: string; mine: boolean }>;
};

async function partners(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Reader[]> {
  const { data } = await supabase.from("profiles").select("user_id, display_name, partner").order("partner");
  return (data ?? []).map((p) => ({ userId: p.user_id, name: p.display_name, partner: p.partner }));
}

/** The two partners, for the readers checkboxes. */
export async function getPartners(): Promise<Reader[]> {
  return partners(await createClient());
}

/** Every book with a signed cover URL (PRD FR-38: shown as a shelf grouped by status). */
export async function getShelf(): Promise<ShelfBook[]> {
  const supabase = await createClient();
  const [{ data }, people] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, author, status, cover_path, readers, rating, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1000),
    partners(supabase),
  ]);
  const rows = data ?? [];
  const covers = await signPaths(
    supabase,
    rows.map((r) => r.cover_path ?? undefined),
  );
  return rows.map((r, i) => ({
    id: r.id,
    title: r.title,
    author: r.author,
    status: r.status,
    coverUrl: covers[i] ?? null,
    rating: r.rating,
    readers: people.filter((p) => r.readers.includes(p.userId)),
  }));
}

export async function getBook(id: string, viewerId: string): Promise<BookDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const [{ data: b }, { data: quotes }, people] = await Promise.all([
    supabase.from("books").select("*").eq("id", id).maybeSingle(),
    supabase.from("book_quotes").select("id, text, page, added_by").eq("book_id", id).order("created_at"),
    partners(supabase),
  ]);
  if (!b) return null;
  const [coverUrl] = await signPaths(supabase, [b.cover_path ?? undefined]);
  const nameOf = new Map(people.map((p) => [p.userId, p.name]));
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    status: b.status,
    coverUrl: coverUrl ?? null,
    rating: b.rating,
    readers: people.filter((p) => b.readers.includes(p.userId)),
    isbn: b.isbn,
    startedOn: b.started_on,
    finishedOn: b.finished_on,
    notes: b.notes,
    quotes: (quotes ?? []).map((q) => ({
      id: q.id,
      text: q.text,
      page: q.page,
      addedBy: q.added_by ? (nameOf.get(q.added_by) ?? "") : "",
      mine: q.added_by === viewerId,
    })),
  };
}
