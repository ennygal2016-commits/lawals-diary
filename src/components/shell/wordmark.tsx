import Link from "next/link";

import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/site";

/** Two interlocking rings — partner A (accent) and partner B (lavender). */
export function RingsMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 22" aria-hidden className={cn("h-[22px] w-[34px] shrink-0", className)}>
      <circle cx="11" cy="11" r="9" fill="none" stroke="var(--accent)" strokeWidth="1.6" />
      <circle cx="23" cy="11" r="9" fill="none" stroke="var(--lavender)" strokeWidth="1.6" />
    </svg>
  );
}

/** DESIGN.md §2 Wordmark — rings + site name in Instrument Serif (26px desktop, 22px phone). */
export function Wordmark({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2.5 text-fg no-underline hover:text-fg", className)}
    >
      <RingsMark className="h-[18px] w-7 md:h-[22px] md:w-[34px]" />
      <span className="serif text-[22px] leading-none md:text-[26px]">{SITE_NAME}</span>
    </Link>
  );
}
