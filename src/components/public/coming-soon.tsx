import { RingsMark } from "@/components/shell/wordmark";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/** Shown on every public page while the public site is switched off in Settings (PRD FR-42). */
export function ComingSoon() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <RingsMark className="h-[44px] w-[68px]" />
      <p className="eyebrow m-0">{SITE_NAME}</p>
      <h1 className="page-title m-0">Coming soon</h1>
      <p className="serif m-0 max-w-[520px] text-[22px] leading-snug text-fg-soft italic">{SITE_TAGLINE}</p>
    </main>
  );
}
