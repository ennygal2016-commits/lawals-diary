import type { Metadata } from "next";

import { ComingSoon } from "@/components/public/coming-soon";
import { PublicFooter } from "@/components/shell/public-footer";
import { PublicHeader } from "@/components/shell/public-header";
import { SkipLink } from "@/components/shell/skip-link";
import { isPublicSiteOn } from "@/server/queries/public";

// Public pages are rebuilt at most once a minute; switching the site on/off takes effect within a minute.
export const revalidate = 60;

/**
 * The public site (DESIGN.md §4). When it is switched off in Settings, every public page is a simple
 * "Coming soon" — and the public_* views return nothing anyway.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  if (!(await isPublicSiteOn())) return <ComingSoon />;
  return (
    <div className="flex min-h-dvh flex-col text-[17px] leading-[1.6]">
      <SkipLink />
      <PublicHeader />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}

export const metadata: Metadata = {
  openGraph: { type: "website", siteName: "Lawal's diary" },
};
