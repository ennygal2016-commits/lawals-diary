import type { Metadata } from "next";

import { RingsMark } from "@/components/shell/wordmark";
import { SITE_NAME } from "@/lib/site";
import { RetryButton } from "./retry-button";

export const dynamic = "force-static";
export const metadata: Metadata = { title: "Offline", robots: { index: false, follow: false } };

/** Precached by the service worker and shown when a page can't be reached. Contains nothing private. */
export default function OfflinePage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center gap-5 px-5 py-16">
      <div className="flex items-center gap-2.5">
        <RingsMark />
        <span className="serif text-[22px] leading-none">{SITE_NAME}</span>
      </div>
      <p className="eyebrow m-0">Offline</p>
      <h1 className="serif m-0 text-[44px] leading-[1.05] md:text-[56px]">You’re offline.</h1>
      <p className="m-0 text-fg-soft">
        The diary needs a connection to open pages — nothing is kept on this device. Check your Wi-Fi or data,
        then try again.
      </p>
      <div>
        <RetryButton />
      </div>
    </main>
  );
}
