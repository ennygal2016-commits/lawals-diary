"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookPlus, Library, Search } from "lucide-react";

import { InitialChip } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { BOOK_STATUSES } from "@/lib/books";
import { createBook, lookupIsbn } from "@/server/actions/books";
import type { Reader, ShelfBook } from "@/server/queries/books";
import { BookForm, type BookFormValues, EMPTY_BOOK } from "./book-form";

export type BookshelfActions = { lookupIsbn: typeof lookupIsbn; createBook: typeof createBook };
const serverActions: BookshelfActions = { lookupIsbn, createBook };

/** /admin/bookshelf (PRD FR-37/38): a shelf of covers grouped by Reading, Want to read and Finished. */
export function Bookshelf({
  books,
  partners,
  base = "/admin/bookshelf",
  actions = serverActions,
}: {
  books: ShelfBook[];
  partners: Reader[];
  base?: string;
  actions?: BookshelfActions;
}) {
  const [adding, setAdding] = React.useState(false);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title m-0">Bookshelf</h1>
        <Button onClick={() => setAdding(true)}>
          <BookPlus aria-hidden strokeWidth={1.75} />
          Add a book
        </Button>
      </div>

      {books.length === 0 ? (
        <EmptyState
          icon={Library}
          variant="dashed"
          message="No books yet. Add one by its ISBN, or type the details in."
          action={
            <Button variant="secondary" onClick={() => setAdding(true)}>
              Add the first book
            </Button>
          }
        />
      ) : (
        BOOK_STATUSES.map(({ value, label }) => {
          const shelf = books.filter((b) => b.status === value);
          return (
            <section key={value} aria-labelledby={`shelf-${value}`} className="flex flex-col gap-4">
              <h2
                id={`shelf-${value}`}
                className="serif m-0 flex items-baseline gap-3 text-[30px] leading-none"
              >
                {label}
                <span className="font-mono text-[12px] text-muted uppercase">
                  {shelf.length} {shelf.length === 1 ? "book" : "books"}
                </span>
              </h2>
              {shelf.length === 0 ? (
                <p className="m-0 text-[15px] text-muted">Nothing here yet.</p>
              ) : (
                <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-6 p-0 sm:grid-cols-4 lg:grid-cols-6">
                  {shelf.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={`${base}/${b.id}`}
                        className="group flex flex-col gap-2 text-fg no-underline"
                      >
                        <span className="relative block aspect-[2/3] overflow-hidden rounded-[8px] border border-border bg-raised shadow-menu transition-transform group-hover:-translate-y-1">
                          {b.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                            <img src={b.coverUrl} alt="" className="size-full object-cover" />
                          ) : (
                            <span className="serif flex size-full items-center justify-center p-3 text-center text-[18px] leading-tight text-fg-soft">
                              {b.title}
                            </span>
                          )}
                        </span>
                        <span className="line-clamp-2 text-[14px] leading-snug font-medium">{b.title}</span>
                        {b.author ? (
                          <span className="-mt-1.5 truncate text-[13px] text-muted">{b.author}</span>
                        ) : null}
                        {b.readers.length ? (
                          <span
                            className="flex gap-1"
                            aria-label={`Reading: ${b.readers.map((r) => r.name).join(", ")}`}
                          >
                            {b.readers.map((r) => (
                              <InitialChip key={r.userId} name={r.name} partner={r.partner} size="sm" />
                            ))}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}

      <AddBookDialog
        open={adding}
        onOpenChange={setAdding}
        partners={partners}
        base={base}
        actions={actions}
      />
    </>
  );
}

function AddBookDialog({
  open,
  onOpenChange,
  partners,
  base,
  actions,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  partners: Reader[];
  base: string;
  actions: BookshelfActions;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isbn, setIsbn] = React.useState("");
  const [lookupMessage, setLookupMessage] = React.useState<string>();
  const [looking, setLooking] = React.useState(false);
  const [values, setValues] = React.useState<BookFormValues>(EMPTY_BOOK);
  const [cover, setCover] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (open) {
      setIsbn("");
      setLookupMessage(undefined);
      setValues(EMPTY_BOOK);
      setCover(null);
    }
  }, [open]);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLooking(true);
    const r = await actions.lookupIsbn(isbn);
    setLooking(false);
    if (r.ok) {
      setValues({
        ...EMPTY_BOOK,
        title: r.book.title,
        author: r.book.author ?? "",
        isbn: r.isbn,
        cover_url: r.book.coverUrl ?? undefined,
      });
      setCover(r.book.coverUrl);
      setLookupMessage(`Found “${r.book.title}”. Check the details, then add it.`);
    } else {
      setValues({ ...EMPTY_BOOK, isbn });
      setCover(null);
      setLookupMessage(r.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Add a book</DialogTitle>
          <DialogDescription>Look it up by ISBN, or just fill in the details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={lookup} className="flex items-end gap-3">
          <Field label="ISBN" className="flex-1">
            {(c) => (
              <Input
                {...c}
                value={isbn}
                inputMode="numeric"
                placeholder="978…"
                onChange={(e) => setIsbn(e.target.value)}
              />
            )}
          </Field>
          <Button type="submit" variant="secondary" className="h-12" disabled={looking || !isbn.trim()}>
            <Search aria-hidden strokeWidth={1.75} />
            {looking ? "Looking…" : "Look up"}
          </Button>
        </form>
        <p role="status" aria-live="polite" className="m-0 -mt-2 min-h-5 text-[14px] text-muted">
          {lookupMessage}
        </p>

        <BookForm
          initial={values}
          partners={partners}
          submitLabel="Add to the shelf"
          coverPreview={cover}
          pending={pending}
          onSubmit={(data) =>
            startTransition(async () => {
              const r = await actions.createBook(data);
              toast({ title: r.message, variant: r.ok ? "default" : "danger" });
              if (r.ok) {
                onOpenChange(false);
                if (r.id) router.push(`${base}/${r.id}`);
                router.refresh();
              }
            })
          }
        />
      </DialogContent>
    </Dialog>
  );
}
