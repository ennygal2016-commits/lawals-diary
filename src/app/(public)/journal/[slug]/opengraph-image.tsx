import { ImageResponse } from "next/og";

import { entryLongDate } from "@/lib/dates";
import { SITE_NAME } from "@/lib/site";
import { getPublicEntry } from "@/server/queries/public";
import { OG_SIZE, OgCard } from "../../../og-card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A public entry from our diary";

/** Open Graph image for a public journal entry: its title and date (no private data — public view only). */
export default async function EntryOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const entry = await getPublicEntry((await params).slug);
  return new ImageResponse(
    <OgCard
      eyebrow={entry ? entryLongDate(entry.date) : "Journal"}
      title={entry?.title ?? "From our diary"}
      footer={`${SITE_NAME} · Journal`}
    />,
    size,
  );
}
