import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/shell/page";
import { ToastProvider } from "@/components/ui/toast";
import { BookPagePreview } from "../../phase11-previews";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Book preview", robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();
  return (
    <ToastProvider>
      <main id="main" className="pb-24">
        <PageContainer width="medium" className="gap-8">
          <BookPagePreview />
        </PageContainer>
      </main>
    </ToastProvider>
  );
}
