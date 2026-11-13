import { ImageResponse } from "next/og";

import { PARTNERS, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { OG_SIZE, OgCard } from "./og-card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = `${PARTNERS.a.displayName} & ${PARTNERS.b.displayName} — ${SITE_TAGLINE}`;

/** Default Open Graph image for the public site. */
export default function OpenGraphImage() {
  return new ImageResponse(
    <OgCard
      eyebrow="Our story"
      title={`${PARTNERS.a.displayName} & ${PARTNERS.b.displayName}`}
      footer={`${SITE_NAME} · ${SITE_TAGLINE}`}
    />,
    size,
  );
}
