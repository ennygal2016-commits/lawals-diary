import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FoundationAdminDetail } from "@/components/foundation/admin-detail";
import { LiveRefresh } from "@/components/foundation/live-refresh";
import { PageContainer } from "@/components/shell/page";
import { calendarDate } from "@/lib/dates";
import { getApplication } from "@/server/queries/foundation";
import { getViewer } from "@/server/queries/viewer";

export const metadata: Metadata = { title: "Application" };

/** /admin/foundation/[id] (PRD FR-35). */
export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  const app = await getApplication((await params).id);
  if (!app) notFound();

  return (
    <PageContainer width="medium">
      <LiveRefresh table="application_events" />
      <FoundationAdminDetail app={app} today={calendarDate(new Date(), viewer.timezone)} />
    </PageContainer>
  );
}
