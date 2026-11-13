import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/shell/page";
import { ToastProvider } from "@/components/ui/toast";
import { BookshelfPreview } from "../phase11-previews";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bookshelf preview", robots: { index: false, follow: false } };

/** Dev tool: /admin/bookshelf with sample books (?empty=1). ISBN 9780140449136 "finds" a book. */
export default async function Page({ searchParams }: { searchParams: Promise<{ empty?: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();
  const empty = (await searchParams).empty === "1";
  return (
    <ToastProvider>
      <main id="main" className="pb-24">
        <PageContainer width="wide" className="gap-10">
          <BookshelfPreview empty={empty} />
        </PageContainer>
      </main>
    </ToastProvider>
  );
}
