import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";

import { RichText } from "@/components/entries/rich-text";
import { PublicGallery } from "@/components/public/public-gallery";
import { InitialChip, MoodDot } from "@/components/ui/badges";
import { entryLongDate } from "@/lib/dates";
import { CATEGORIES } from "@/lib/moods";
import { isDocEmpty } from "@/lib/rich-text";
import { getPublicEntry } from "@/server/queries/public";

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const entry = await getPublicEntry((await params).slug);
  if (!entry) return { title: "Journal" };
  return {
    title: entry.title,
    description: entry.excerpt || undefined,
    openGraph: { type: "article", title: entry.title, description: entry.excerpt || undefined },
  };
}

/** /journal/[slug] (PRD FR-18): a public entry; location, mood and comments only if the author opted in. */
export default async function PublicEntryPage({ params }: { params: Params }) {
  const entry = await getPublicEntry((await params).slug);
  if (!entry) notFound();
  const category = CATEGORIES.find((c) => c.value === entry.category)?.label ?? entry.category;

  return (
    <article className="mx-auto flex max-w-[824px] flex-col gap-8 px-5 pt-10 pb-24 md:px-8 md:pt-16">
      <Link href="/journal" className="inline-flex items-center gap-2 text-[14px] text-fg-soft no-underline">
        <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
        Journal
      </Link>
      <header className="flex flex-col gap-4">
        <p className="eyebrow m-0">{entryLongDate(entry.date)}</p>
        <h1 className="serif m-0 text-[44px] leading-[1.05] md:text-[60px]">{entry.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-muted">
          <span className="flex items-center gap-2">
            <InitialChip name={entry.author.name} partner={entry.author.partner} />
            <span className="text-fg-soft">{entry.author.name}</span>
          </span>
          <span>{category}</span>
          {entry.mood ? <MoodDot mood={entry.mood} /> : null}
          {entry.location ? (
            <span className="flex items-center gap-1.5">
              <MapPin aria-hidden className="size-4" strokeWidth={1.75} />
              {entry.location}
            </span>
          ) : null}
        </div>
      </header>

      {entry.photos[0] ? (
        // eslint-disable-next-line @next/next/no-img-element -- public CDN copy
        <img
          src={entry.photos[0].full}
          alt={entry.photos[0].caption ?? ""}
          className="w-full rounded-card object-cover"
        />
      ) : null}

      {!isDocEmpty(entry.body) ? <RichText doc={entry.body} className="text-[18px]" /> : null}

      {entry.photos.length > 1 ? (
        <section aria-label="Photos">
          <PublicGallery photos={entry.photos} />
        </section>
      ) : null}

      {entry.comments && entry.comments.length ? (
        <section
          aria-labelledby="comments-heading"
          className="flex flex-col gap-4 border-t border-divider pt-8"
        >
          <h2 id="comments-heading" className="serif m-0 text-[28px]">
            Comments
          </h2>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {entry.comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <InitialChip name={c.author} partner={c.partner} className="mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="text-[14px] font-medium text-fg">{c.author}</span>
                  <p className="m-0 text-[15px] whitespace-pre-line text-fg-soft">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
