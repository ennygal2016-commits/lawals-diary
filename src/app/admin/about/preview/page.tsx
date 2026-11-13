import type { Metadata } from "next";
import Link from "next/link";

import { OurStory } from "@/components/public/our-story";
import { getAboutPreview } from "@/server/queries/about";
import { getViewer } from "@/server/queries/viewer";

export const metadata: Metadata = { title: "Preview · Our story" };

/** /admin/about/preview — the saved DRAFT exactly as the public page will show it (private URLs, admins only). */
export default async function AboutPreviewPage() {
  await getViewer();
  const story = await getAboutPreview();
  return (
    <>
      <div
        role="note"
        className="sticky top-0 z-50 border-b border-border-accent bg-note px-5 py-3 text-center text-[14px] text-fg lg:top-[69px]"
      >
        Preview of your saved draft — not public until you publish.{" "}
        <Link href="/admin/about" className="text-accent underline">
          Back to the editor
        </Link>
      </div>
      <OurStory story={story} preview />
    </>
  );
}
