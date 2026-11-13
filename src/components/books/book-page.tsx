"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Quote, Star, Trash2 } from "lucide-react";

import { InitialChip } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { bookStatusLabel } from "@/lib/books";
import { addQuote, deleteBook, deleteQuote, updateBook } from "@/server/actions/books";
import type { BookDetail, Reader } from "@/server/queries/books";
import { BookForm } from "./book-form";

export type BookPageActions = {
  updateBook: typeof updateBook;
  deleteBook: typeof deleteBook;
  addQuote: typeof addQuote;
  deleteQuote: typeof deleteQuote;
};
const serverActions: BookPageActions = { updateBook, deleteBook, addQuote, deleteQuote };

/** /admin/bookshelf/[id] (PRD FR-37): readers, dates, rating, notes and favourite quotes. */
export function BookPage({
  book,
  partners,
  base = "/admin/bookshelf",
  actions = serverActions,
}: {
  book: BookDetail;
  partners: Reader[];
  base?: string;
  actions?: BookPageActions;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();
  const [confirm, setConfirm] = React.useState(false);
  const [quote, setQuote] = React.useState("");
  const [page, setPage] = React.useState("");

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    startTransition(async () => {
      const r = await fn();
      toast({ title: r.message, variant: r.ok ? "default" : "danger" });
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });

  const initial = React.useMemo(
    () => ({
      title: book.title,
      author: book.author ?? "",
      isbn: book.isbn ?? "",
      status: book.status,
      readers: book.readers.map((r) => r.userId),
      started_on: book.startedOn ?? "",
      finished_on: book.finishedOn ?? "",
      rating: book.rating,
      notes: book.notes ?? "",
    }),
    [book],
  );

  return (
    <>
      <Link href={base} className="inline-flex items-center gap-2 text-[14px] text-fg-soft no-underline">
        <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
        Bookshelf
      </Link>

      <header className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-[10px] border border-border bg-raised shadow-menu">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
            <img src={book.coverUrl} alt={`Cover of ${book.title}`} className="size-full object-cover" />
          ) : (
            <span className="serif flex size-full items-center justify-center p-3 text-center text-[20px] text-fg-soft">
              {book.title}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p className="eyebrow m-0">{bookStatusLabel(book.status)}</p>
          <h1 className="page-title m-0">{book.title}</h1>
          {book.author ? <p className="m-0 text-[18px] text-fg-soft">{book.author}</p> : null}
          <div className="flex flex-wrap items-center gap-3 text-[14px] text-muted">
            {book.readers.map((r) => (
              <span key={r.userId} className="flex items-center gap-1.5">
                <InitialChip name={r.name} partner={r.partner} size="sm" />
                {r.name}
              </span>
            ))}
            {book.rating ? (
              <span
                role="img"
                className="flex items-center gap-1"
                aria-label={`Rated ${book.rating} out of 5`}
              >
                {Array.from({ length: book.rating }, (_, i) => (
                  <Star key={i} aria-hidden className="size-4 fill-warning text-warning" strokeWidth={1.5} />
                ))}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <section aria-labelledby="quotes-heading" className="flex flex-col gap-4">
        <h2 id="quotes-heading" className="serif m-0 text-[30px] leading-none">
          Favourite quotes
        </h2>
        {book.quotes.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">No quotes yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {book.quotes.map((q) => (
              <li key={q.id} className="flex gap-3 rounded-card border border-border bg-surface p-5">
                <Quote aria-hidden className="mt-1 size-5 shrink-0 text-accent" strokeWidth={1.5} />
                <figure className="m-0 flex flex-1 flex-col gap-2">
                  <blockquote className="serif m-0 text-[21px] leading-snug whitespace-pre-line italic">
                    {q.text}
                  </blockquote>
                  <figcaption className="font-mono text-[12px] text-muted uppercase">
                    {[q.page ? `p. ${q.page}` : null, q.addedBy ? `added by ${q.addedBy}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </figcaption>
                </figure>
                {q.mine ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Remove this quote"
                    disabled={pending}
                    onClick={() => run(() => actions.deleteQuote(q.id))}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <form
          className="grid gap-3 sm:grid-cols-[1fr_120px]"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => actions.addQuote({ bookId: book.id, text: quote, page }),
              () => {
                setQuote("");
                setPage("");
              },
            );
          }}
        >
          <Field label="Add a quote">
            {(c) => (
              <Textarea
                {...c}
                rows={2}
                maxLength={2000}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
              />
            )}
          </Field>
          <Field label="Page">
            {(c) => <Input {...c} maxLength={20} value={page} onChange={(e) => setPage(e.target.value)} />}
          </Field>
          <div>
            <Button type="submit" variant="secondary" disabled={pending || !quote.trim()}>
              Add quote
            </Button>
          </div>
        </form>
      </section>

      <section
        aria-labelledby="details-heading"
        className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 md:p-7"
      >
        <h2 id="details-heading" className="serif m-0 text-[26px] leading-none">
          Details
        </h2>
        <BookForm
          initial={initial}
          partners={partners}
          submitLabel="Save"
          coverPreview={book.coverUrl}
          pending={pending}
          onSubmit={(data) => {
            data.set("id", book.id);
            run(() => actions.updateBook(data));
          }}
        />
      </section>

      <div>
        <Button variant="ghost" onClick={() => setConfirm(true)}>
          <Trash2 aria-hidden strokeWidth={1.75} />
          Remove from the shelf
        </Button>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Remove this book?</DialogTitle>
            <DialogDescription>Its notes and quotes go too.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await actions.deleteBook(book.id);
                  toast({ title: r.message, variant: r.ok ? "default" : "danger" });
                  if (r.ok) router.push(base);
                })
              }
            >
              Remove book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
