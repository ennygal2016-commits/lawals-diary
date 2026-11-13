"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/shell/wordmark";
import { PUBLIC_NAV, isActive } from "@/lib/nav";

/** Nocturne "Our story · public site" header: lighter, no admin controls, underline for the active link. */
export function PublicHeader() {
  const pathname = usePathname();
  return (
    <header className="mx-auto flex w-full max-w-[1304px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-5 md:px-8">
      <Wordmark href="/" />
      <nav aria-label="Public" className="flex flex-wrap gap-x-5 gap-y-1 text-[15px] md:gap-x-6">
        {PUBLIC_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "border-b py-2.5 no-underline transition-colors",
                active
                  ? "border-accent text-fg hover:text-fg"
                  : "border-transparent text-muted hover:text-fg",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
