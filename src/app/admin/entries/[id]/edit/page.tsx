import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { EntryForm } from "@/components/entries/entry-form";
import { PageContainer } from "@/components/shell/page";
import { calendarDate } from "@/lib/dates";
import { getEntry } from "@/server/queries/entries";
import { getViewer } from "@/server/queries/viewer";

export const metadata: Metadata = { title: "Edit entry" };

/** /admin/entries/[id]/edit — author only; deleted entries must be restored first. */
export default async function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [viewer, entry] = await Promise.all([getViewer(), getEntry(id)]);
  if (!entry) notFound();
  if (entry.author.userId !== viewer.userId || entry.deletedAt) redirect(`/admin/entries/${entry.id}`);

  const today = calendarDate(new Date(), viewer.timezone);
  const isDraft = entry.status === "draft";

  return (
    <PageContainer width="narrow" className="pt-5 md:pt-10">
      <h1 className="visually-hidden">{isDraft ? "Edit draft" : "Edit entry"}</h1>
      <EntryForm
        entryId={entry.id}
        status={entry.status}
        lastSavedAt={entry.updatedAt}
        maxDate={entry.entryDate > today ? entry.entryDate : today}
        closeHref={isDraft ? "/admin/drafts" : `/admin/entries/${entry.id}`}
        initial={{
          title: entry.title,
          entry_date: entry.entryDate,
          location: entry.location ?? "",
          mood: entry.mood,
          category: entry.category,
          visibility: entry.visibility,
          body_json: entry.body,
          photos: entry.photos.map((p) => ({ id: p.id, thumbUrl: p.thumbUrl })),
        }}
      />
    </PageContainer>
  );
}
