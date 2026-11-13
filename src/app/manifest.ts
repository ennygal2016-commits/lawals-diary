import type { MetadataRoute } from "next";

import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/** PWA manifest: installs as "Lawal's diary", opening straight to Home (sign-in if needed). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/admin",
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_TAGLINE,
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0e0c14",
    theme_color: "#0e0c14",
    lang: "en-CA",
    categories: ["lifestyle", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "New entry",
        url: "/admin/entries/new",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      { name: "Timeline", url: "/admin/timeline", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
