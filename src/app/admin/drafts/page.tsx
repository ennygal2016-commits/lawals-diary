import type { Metadata } from "next";
import Link from "next/link";

import { RestoreButton } from "@/components/entries/entry-actions";
import { PageContainer, PageHeader } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { entryDay, noteStamp } from "@/lib/dates";
import { NEW_ENTRY_HREF } from "@/lib/nav";
import { RESTORE_DAYS } from "@/lib/validation/entry";
import { getDraftsAndDeleted } from "@/server/queries/entries";
import { getViewer } from "@/server/queries/viewer";

export const metadata: Metadata = { title: "Drafts" };

/** More → Drafts (PRD FR-15): your unpublished drafts, plus entries you deleted in the last 30 days. */
export default async function DraftsPage() {
  const viewer = await getViewer();
  const { drafts, deleted } = await getDraftsAndDeleted(viewer.userId);
  const now = new Date();

  return (
    <PageContainer width="narrow">
      <PageHeader
        title="Drafts"
        meta={drafts.length ? `${drafts.length} ${drafts.length === 1 ? "draft" : "drafts"}` : undefined}
      />

      {drafts.length === 0 ? (
        <EmptyState
          message="No drafts. Anything you start writing is saved here until you press Save entry."
          action={
            <Button asChild variant="secondary">
              <Link href={NEW_ENTRY_HREF}>Start an entry</Link>
            </Button>
          }
        />
      ) : (
        <ul aria-label="Drafts" className="m-0 flex list-none flex-col p-0">
          {drafts.map((d) => (
            <li key={d.id} className="border-b border-divider-soft">
              <Link
                href={`/admin/entries/${d.id}/edit`}
                className="flex items-center justify-between gap-4 py-4 text-fg no-underline hover:text-accent"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-[17px] font-medium">{d.title}</span>
                  <span className="font-mono text-[12px] text-muted uppercase">
                    {entryDay(d.entryDate)} · saved {noteStamp(new Date(d.updatedAt), now, viewer.timezone)}
                  </span>
                </span>
                <span className="shrink-0 text-[14px] text-accent">Continue →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {deleted.length > 0 ? (
        <section aria-labelledby="deleted-heading" className="flex flex-col gap-3">
          <h2 id="deleted-heading" className="serif m-0 text-[28px] leading-none">
            Recently deleted
          </h2>
          <p className="m-0 text-[14px] text-muted">Restore within {RESTORE_DAYS} days of deleting.</p>
          <ul className="m-0 flex list-none flex-col p-0">
            {deleted.map((d) => {
              const until = new Date(new Date(d.deletedAt).getTime() + RESTORE_DAYS * 86_400_000);
              const daysLeft = Math.max(0, Math.ceil((until.getTime() - now.getTime()) / 86_400_000));
              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-4 border-b border-divider-soft py-4"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <Link
                      href={`/admin/entries/${d.id}`}
                      className="truncate text-[17px] font-medium text-fg-soft"
                    >
                      {d.title}
                    </Link>
                    <span className="font-mono text-[12px] text-muted uppercase">
                      {d.status === "draft" ? "Draft" : entryDay(d.entryDate)} · {daysLeft}{" "}
                      {daysLeft === 1 ? "day" : "days"} left
                    </span>
                  </span>
                  <RestoreButton entryId={d.id} size="sm" />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </PageContainer>
  );
}
