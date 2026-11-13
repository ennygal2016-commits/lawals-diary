import type { MetadataRoute } from "next";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** robots.txt: the public site is open; private and tool routes are never crawled. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/login", "/auth", "/styleguide", "/api", "/offline"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
