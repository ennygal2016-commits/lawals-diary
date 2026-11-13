import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/shell/page";
import { ToastProvider } from "@/components/ui/toast";
import { parseTimelineParams } from "@/lib/timeline";
import { TimelinePreview } from "./preview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Timeline preview", robots: { index: false, follow: false } };

/** Dev tool: the Timeline with 75 sample entries filtered in memory (?empty=1 for a diary with no entries). */
export default async function TimelinePreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();
  const params = await searchParams;
  return (
    <ToastProvider>
      <main id="main" className="pb-24">
        <PageContainer width="narrow">
          <TimelinePreview filters={parseTimelineParams(params)} empty={params.empty === "1"} />
        </PageContainer>
      </main>
    </ToastProvider>
  );
}
