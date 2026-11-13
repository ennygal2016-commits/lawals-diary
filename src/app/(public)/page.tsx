import type { Metadata } from "next";

import { OurStory } from "@/components/public/our-story";
import { EMPTY_DOC } from "@/lib/rich-text";
import { PARTNERS, SITE_TAGLINE } from "@/lib/site";
import { getPublicStory } from "@/server/queries/about";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: `${PARTNERS.a.displayName} & ${PARTNERS.b.displayName} · Our story` },
  description: SITE_TAGLINE,
};

/** "/" — Our story (PRD FR-39, Nocturne "Our story · public site"): the PUBLISHED About Us page. */
export default async function OurStoryPage() {
  const story = await getPublicStory();
  return (
    <OurStory
      story={
        story ?? {
          coupleNames: `${PARTNERS.a.displayName} & ${PARTNERS.b.displayName}`,
          since: null,
          heroUrl: null,
          story: EMPTY_DOC,
          milestones: [],
          gallery: [],
        }
      }
    />
  );
}
