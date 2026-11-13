import type { Metadata } from "next";
import Link from "next/link";

import { InitialChip } from "@/components/ui/badges";
import { EmptyState } from "@/components/ui/empty-state";
import { entryLongDate } from "@/lib/dates";
import { getPublicJournal } from "@/server/queries/public";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Journal",
  description: "The entries from our diary that we chose to share.",
};

/** /journal (PRD FR-18): public entries, newest first, 20 a page. */
export default async function JournalPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Math.min(500, Number((await searchParams).page) || 1));
  const { entries, more } = await getPublicJournal(page);

  return (
    <div className="mx-auto flex max-w-[824px] flex-col gap-10 px-5 pt-10 pb-24 md:px-8 md:pt-16">
      <header className="flex flex-col gap-3">
        <p className="eyebrow m-0">From our diary</p>
        <h1 className="page-title m-0">Journal</h1>
        <p className="m-0 text-[17px] text-fg-soft">The days we chose to share.</p>
      </header>

      {entries.length === 0 ? (
        <EmptyState variant="dashed" message="Nothing shared yet — check back soon." />
      ) : (
        <ol className="m-0 flex list-none flex-col gap-5 p-0">
          {entries.map((e) => (
            <li key={e.slug}>
              <article className="relative flex flex-col gap-4 rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong sm:flex-row sm:p-5">
                {e.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- public CDN copy
                  <img
                    src={e.cover}
                    alt=""
                    loading="lazy"
                    className="aspect-[4/3] w-full rounded-tile object-cover sm:w-48"
                  />
                ) : null}
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="m-0 flex items-center gap-2 font-mono text-[12px] text-muted uppercase">
                    <InitialChip name={e.author.name} partner={e.author.partner} size="sm" />
                    {entryLongDate(e.date)}
                  </p>
                  <h2 className="serif m-0 text-[28px] leading-tight">
                    <Link
                      href={`/journal/${e.slug}`}
                      className="text-fg no-underline after:absolute after:inset-0"
                    >
                      {e.title}
                    </Link>
                  </h2>
                  {e.excerpt ? <p className="m-0 line-clamp-3 text-[15px] text-muted">{e.excerpt}</p> : null}
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}

      {page > 1 || more ? (
        <nav aria-label="Pages" className="flex justify-between">
          {page > 1 ? (
            <Link href={page === 2 ? "/journal" : `/journal?page=${page - 1}`}>← Newer</Link>
          ) : (
            <span />
          )}
          {more ? <Link href={`/journal?page=${page + 1}`}>Older →</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
