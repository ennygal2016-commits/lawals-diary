import type { Metadata } from "next";

import { PublicGallery } from "@/components/public/public-gallery";
import { EmptyState } from "@/components/ui/empty-state";
import { getPublicGallery } from "@/server/queries/public";

export const revalidate = 60;
export const metadata: Metadata = { title: "Gallery", description: "Photos we chose to share." };

/** /gallery: photos marked "Show in public gallery", with a lightbox. */
export default async function GalleryPage() {
  const photos = await getPublicGallery();
  return (
    <div className="mx-auto flex max-w-[1214px] flex-col gap-8 px-5 pt-10 pb-24 md:px-8 md:pt-16">
      <header className="flex flex-col gap-3">
        <p className="eyebrow m-0">Photos</p>
        <h1 className="page-title m-0">Gallery</h1>
      </header>
      {photos.length === 0 ? (
        <EmptyState variant="dashed" message="No photos shared yet." />
      ) : (
        <PublicGallery photos={photos} />
      )}
    </div>
  );
}
