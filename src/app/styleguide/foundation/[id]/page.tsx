import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/shell/page";
import { ToastProvider } from "@/components/ui/toast";
import type { ApplicationStatus } from "@/types/database";
import { sampleDetail } from "../sample";
import { FoundationDetailPreview } from "./preview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Application preview", robots: { index: false, follow: false } };

/** Dev tool: /admin/foundation/[id] with a sample application (?status=new etc.; default funded). */
export default async function FoundationDetailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();
  const s = (await searchParams).status;
  const status = (
    ["new", "reviewing", "shortlisted", "approved", "declined", "funded"].includes(s ?? "") ? s : "funded"
  ) as ApplicationStatus;
  return (
    <ToastProvider>
      <main id="main" className="pb-24">
        <PageContainer width="medium">
          <FoundationDetailPreview app={sampleDetail(status)} />
        </PageContainer>
      </main>
    </ToastProvider>
  );
}
