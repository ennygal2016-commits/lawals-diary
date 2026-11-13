import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EntryForm } from "@/components/entries/entry-form";
import { PageContainer } from "@/components/shell/page";
import { ToastProvider } from "@/components/ui/toast";
import { calendarDate } from "@/lib/dates";
import type { RichDoc } from "@/lib/rich-text";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entry form preview", robots: { index: false, follow: false } };

const SAMPLE_BODY: RichDoc = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "The train stopped twice and we didn’t mind." }] },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Things we said" }] },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Umbrellas are a scam" }] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Soup tonight" }] }],
        },
      ],
    },
  ],
};

/**
 * Dev tool: the entry form without a database (?empty=1 for a blank new entry). Autosave calls will fail here —
 * that's expected; the form itself is what's being checked. Same gate as /styleguide.
 */
export default async function EntryFormPreview({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();
  const empty = (await searchParams).empty === "1";
  const today = calendarDate(new Date(), "America/Toronto");

  return (
    <ToastProvider>
      <main id="main">
        <PageContainer width="narrow" className="pt-5 md:pt-10">
          <h1 className="visually-hidden">Entry form preview</h1>
          <EntryForm
            status={empty ? "new" : "draft"}
            entryId={empty ? undefined : "00000000-0000-4000-8000-000000000001"}
            lastSavedAt={empty ? undefined : new Date().toISOString()}
            maxDate={today}
            closeHref="/styleguide"
            initial={{
              title: empty ? "" : "Rain on the train home",
              entry_date: today,
              location: empty ? "" : "Union Station",
              mood: empty ? null : "loved",
              category: "everyday",
              visibility: "private",
              body_json: empty ? { type: "doc", content: [{ type: "paragraph" }] } : SAMPLE_BODY,
              photos: [],
            }}
          />
        </PageContainer>
      </main>
    </ToastProvider>
  );
}
