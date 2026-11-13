import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FoundationAdminList } from "@/components/foundation/admin-list";
import { PageContainer } from "@/components/shell/page";
import { adminFilterSchema } from "@/lib/validation/foundation";
import { sampleList } from "./sample";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Foundation admin preview",
  robots: { index: false, follow: false },
};

type Params = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Dev tool: /admin/foundation with 7 sample applications filtered in memory (?empty=1 for none). */
export default async function FoundationListPreview({ searchParams }: { searchParams: Params }) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();
  const raw = await searchParams;
  const filters = adminFilterSchema.parse({
    status: first(raw.status),
    q: first(raw.q),
    level: first(raw.level),
    page: first(raw.page),
  });
  return (
    <main id="main" className="pb-24">
      <PageContainer width="medium">
        <FoundationAdminList
          base="/styleguide/foundation"
          filters={filters}
          {...sampleList(filters, first(raw.empty) === "1")}
        />
      </PageContainer>
    </main>
  );
}
