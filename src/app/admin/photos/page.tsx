import type { Metadata } from "next";

import { PhotoLibrary } from "@/components/photos/photo-library";
import { PageContainer } from "@/components/shell/page";
import { photoFilterSchema } from "@/lib/validation/photo";
import { listPhotos } from "@/server/actions/photos";
import { getPhotoCounts } from "@/server/queries/photo-library";
import { getViewer } from "@/server/queries/viewer";

export const metadata: Metadata = { title: "Photos" };

/** /admin/photos — the filter lives in the URL (?filter=gallery) so a view can be bookmarked. */
export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await getViewer();
  const filter = photoFilterSchema.catch("all").parse((await searchParams).filter);
  const [first, counts] = await Promise.all([listPhotos(filter, 0), getPhotoCounts()]);

  return (
    <PageContainer width="wide">
      <PhotoLibrary
        key={filter}
        filter={filter}
        initialPhotos={first.photos}
        initialMore={first.more}
        initialCounts={counts}
      />
    </PageContainer>
  );
}
