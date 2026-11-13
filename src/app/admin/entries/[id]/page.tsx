import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";

import { Comments } from "@/components/entries/comments";
import { EntryAuthorActions, RestoreButton } from "@/components/entries/entry-actions";
import { RichText } from "@/components/entries/rich-text";
import { PageContainer } from "@/components/shell/page";
import { InitialChip, MoodDot, VisibilityBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { entryLongDate, noteStamp } from "@/lib/dates";
import { CATEGORIES } from "@/lib/moods";
import { isDocEmpty } from "@/lib/rich-text";
import { RESTORE_DAYS } from "@/lib/validation/entry";
import { getComments, getEntry } from "@/server/queries/entries";
import { getViewer } from "@/server/queries/viewer";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const entry = await getEntry((await params).id);
  return { title: entry?.title ?? "Entry" };
}

/** /admin/entries/[id] — cover, title, meta, body, photo strip, comments (PRD FR-16, DESIGN.md §4). */
export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [viewer, entry] = await Promise.all([getViewer(), getEntry(id)]);
  if (!entry) notFound();
  const comments = await getComments(entry.id);
  const isAuthor = entry.author.userId === viewer.userId;
  const now = new Date();
  const category = CATEGORIES.find((c) => c.value === entry.category)?.label ?? entry.category;
  const cover = entry.photos[0];
  const restoreUntil = entry.deletedAt
    ? new Date(new Date(entry.deletedAt).getTime() + RESTORE_DAYS * 86_400_000)
    : null;

  return (
    <PageContainer width="narrow" className="gap-7 md:gap-9">
      <Link
        href="/admin/timeline"
        className="inline-flex items-center gap-2 text-[14px] text-fg-soft no-underline"
      >
        <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
        Timeline
      </Link>

      {entry.deletedAt ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-tile border border-danger bg-danger-soft px-5 py-4"
        >
          <p className="m-0 text-[15px] text-fg">
            {isAuthor && restoreUntil && restoreUntil > now
              ? `Deleted. You can restore it until ${new Intl.DateTimeFormat("en-CA", { day: "numeric", month: "long", timeZone: viewer.timezone }).format(restoreUntil)}.`
              : "This entry was deleted."}
          </p>
          {isAuthor && restoreUntil && restoreUntil > now ? <RestoreButton entryId={entry.id} /> : null}
        </div>
      ) : entry.status === "draft" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-tile border border-border-accent bg-note px-5 py-4">
          <p className="m-0 text-[15px] text-fg">This is a draft — it isn’t in the diary yet.</p>
          {isAuthor ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/admin/entries/${entry.id}/edit`}>Keep writing</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      <article className="flex flex-col gap-7">
        {cover?.fullUrl ? (
          <div className="-mx-5 overflow-hidden md:mx-0 md:rounded-card">
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
            <img src={cover.fullUrl} alt="Cover photo" className="max-h-[480px] w-full object-cover" />
          </div>
        ) : null}

        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="eyebrow m-0">{entryLongDate(entry.entryDate)}</p>
            <VisibilityBadge visibility={entry.visibility} />
          </div>
          <h1 className="serif m-0 text-[40px] leading-[1.05] md:text-[52px]">{entry.title}</h1>
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
          {isAuthor && !entry.deletedAt ? <EntryAuthorActions entryId={entry.id} /> : null}
        </header>

        {isDocEmpty(entry.body) ? (
          <p className="m-0 text-[15px] text-muted italic">Nothing written about this day yet.</p>
        ) : (
          <RichText doc={entry.body} />
        )}

        {entry.photos.length > 0 ? (
          <section aria-label="Photos">
            <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4">
              {entry.photos.map((photo, i) => (
                <li key={photo.id} className="aspect-square overflow-hidden rounded-tile bg-placeholder-tint">
                  {photo.thumbUrl ? (
                    <a href={photo.fullUrl ?? photo.thumbUrl} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                      <img
                        src={photo.thumbUrl}
                        alt={`Photo ${i + 1} of ${entry.photos.length}`}
                        className="size-full object-cover"
                      />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>

      {entry.status === "published" ? (
        <Comments
          entryId={entry.id}
          comments={comments.map((c) => ({
            id: c.id,
            body: c.body,
            stamp: noteStamp(new Date(c.createdAt), now, viewer.timezone),
            mine: c.author.userId === viewer.userId,
            author: { name: c.author.name, partner: c.author.partner },
          }))}
        />
      ) : null}
    </PageContainer>
  );
}
