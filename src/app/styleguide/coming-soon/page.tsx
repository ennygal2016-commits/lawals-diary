import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ComingSoon } from "@/components/public/coming-soon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Coming soon preview", robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();
  return <ComingSoon />;
}
