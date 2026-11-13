import type { Metadata } from "next";

import { EntryForm } from "@/components/entries/entry-form";
import { PageContainer } from "@/components/shell/page";
import { calendarDate } from "@/lib/dates";
import { EMPTY_DOC } from "@/lib/rich-text";
import { isValidIsoDate } from "@/lib/validation/entry";
import { getViewer } from "@/server/queries/viewer";

export const metadata: Metadata = { title: "New entry" };

/** /admin/entries/new — ?date=YYYY-MM-DD pre-fills the date (Calendar "Write about it", PRD FR-30). */
export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const viewer = await getViewer();
  const today = calendarDate(new Date(), viewer.timezone);
  const requested = (await searchParams).date;
  const date =
    typeof requested === "string" && isValidIsoDate(requested) && requested <= today ? requested : today;

  return (
    <PageContainer width="narrow" className="pt-5 md:pt-10">
      <h1 className="visually-hidden">New entry</h1>
      <EntryForm
        status="new"
        maxDate={today}
        closeHref="/admin"
        initial={{
          title: "",
          entry_date: date,
          location: "",
          mood: null,
          category: "everyday",
          visibility: "private",
          body_json: EMPTY_DOC,
          photos: [],
        }}
      />
    </PageContainer>
  );
}
