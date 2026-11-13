import type { Metadata } from "next";

import { PageContainer } from "@/components/shell/page";
import { TimelineView } from "@/components/timeline/timeline-view";
import { parseTimelineParams } from "@/lib/timeline";
import { fetchTimeline, getTimelineStats } from "@/server/queries/timeline";
import { getViewer } from "@/server/queries/viewer";

export const metadata: Metadata = { title: "Timeline" };

/** /admin/timeline — filters come from the URL (PRD FR-22), so any view can be bookmarked or shared between you. */
export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await getViewer();
  const filters = parseTimelineParams(await searchParams);
  const [firstPage, stats] = await Promise.all([fetchTimeline(filters, 0), getTimelineStats()]);

  return (
    <PageContainer width="narrow">
      <TimelineView filters={filters} firstPage={firstPage} stats={stats} />
    </PageContainer>
  );
}
