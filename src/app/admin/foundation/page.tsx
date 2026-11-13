import type { Metadata } from "next";

import { FoundationAdminList } from "@/components/foundation/admin-list";
import { LiveRefresh } from "@/components/foundation/live-refresh";
import { PageContainer } from "@/components/shell/page";
import { adminFilterSchema } from "@/lib/validation/foundation";
import { getApplicationList } from "@/server/queries/foundation";
import { getViewer } from "@/server/queries/viewer";

export const metadata: Metadata = { title: "Foundation" };

/** /admin/foundation?status=&q=&level=&page= (PRD FR-34). */
export default async function FoundationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await getViewer();
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const filters = adminFilterSchema.parse({
    status: first(raw.status),
    q: first(raw.q),
    level: first(raw.level),
    page: first(raw.page),
  });
  const data = await getApplicationList(filters);

  return (
    <PageContainer width="medium">
      <LiveRefresh table="foundation_applications" />
      <FoundationAdminList filters={filters} {...data} />
    </PageContainer>
  );
}
