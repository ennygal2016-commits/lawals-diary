import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OurStory } from "@/components/public/our-story";
import { PublicFooter } from "@/components/shell/public-footer";
import { PublicHeader } from "@/components/shell/public-header";
import { SAMPLE_STORY } from "../../phase11-sample";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Our story preview", robots: { index: false, follow: false } };

/** Dev tool: the public Our story page with sample data. */
export default function Page() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main id="main" className="flex-1">
        <OurStory story={SAMPLE_STORY} />
      </main>
      <PublicFooter />
    </div>
  );
}
