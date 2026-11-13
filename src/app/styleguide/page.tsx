import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Styleguide } from "./styleguide";

// Read ENABLE_STYLEGUIDE at request time, not at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Styleguide", robots: { index: false, follow: false } };

/** Dev tool. Served in development, or in a production build only when ENABLE_STYLEGUIDE=1. */
export default async function StyleguidePage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();
  const { embed } = await searchParams;
  return <Styleguide embed={embed === "1"} />;
}
