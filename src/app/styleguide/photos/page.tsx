import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/shell/page";
import { ToastProvider } from "@/components/ui/toast";
import { photoFilterSchema } from "@/lib/validation/photo";
import { PhotosPreview } from "./preview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Photos preview", robots: { index: false, follow: false } };

/** Dev tool: /admin/photos with 64 sample photos and in-memory actions (uploads still hit the real route). */
export default async function PhotosPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();
  const filter = photoFilterSchema.catch("all").parse((await searchParams).filter);
  return (
    <ToastProvider>
      <main id="main" className="pb-24">
        <PageContainer width="wide">
          <PhotosPreview filter={filter} />
        </PageContainer>
      </main>
    </ToastProvider>
  );
}
