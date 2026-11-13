import type { MetadataRoute } from "next";

import { getPublicSlugs, isPublicSiteOn } from "@/server/queries/public";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const revalidate = 3600;

/** sitemap.xml — public pages only, plus every public journal entry. Empty while the public site is off. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!(await isPublicSiteOn())) return [];
  const slugs = await getPublicSlugs();
  return [
    { url: `${SITE}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE}/journal`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/gallery`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/foundation`, changeFrequency: "monthly", priority: 0.6 },
    ...slugs.map((s) => ({
      url: `${SITE}/journal/${s.slug}`,
      lastModified: s.updated,
      changeFrequency: "yearly" as const,
    })),
  ];
}
