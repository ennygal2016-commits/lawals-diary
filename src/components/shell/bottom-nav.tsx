"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, PenLine, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NEW_ENTRY_HREF, TAB_MORE_NAV, TAB_NAV, isActive, isEntryFormPath } from "@/lib/nav";

const tabItem =
  "flex h-full flex-col items-center justify-center gap-[3px] text-[11px] no-underline transition-colors [&_svg]:size-5";

/** DESIGN.md §3 Bottom tab bar (phones and tablets, <1024px): Home · Timeline · + · Photos · More. */
export function BottomTabBar() {
  const pathname = usePathname();
  if (isEntryFormPath(pathname)) return null; // the entry form owns the bottom edge (sticky Save)

  const moreActive = TAB_MORE_NAV.some((i) => isActive(pathname, i.href));
  const [home, timeline, photos] = TAB_NAV;

  const tab = (item: NonNullable<typeof home>) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(tabItem, active ? "text-accent hover:text-accent" : "text-muted hover:text-fg")}
      >
        <item.icon aria-hidden strokeWidth={active ? 1.9 : 1.75} />
        {item.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Tabs"
      className={cn(
        "fixed inset-x-3 z-40 grid h-[68px] grid-cols-5 items-center rounded-[24px] border border-border-strong",
        "bottom-[calc(16px+env(safe-area-inset-bottom))] bg-[rgba(28,24,38,0.88)] backdrop-blur-[18px] lg:hidden",
      )}
    >
      {tab(home!)}
      {tab(timeline!)}
      <Link
        href={NEW_ENTRY_HREF}
        aria-label="New entry"
        className="flex size-[52px] items-center justify-center justify-self-center rounded-[18px] bg-accent text-accent-ink shadow-[0_0_24px_rgba(255,138,155,0.45)] hover:bg-accent-hover hover:text-accent-ink"
      >
        <Plus aria-hidden className="size-[22px]" strokeWidth={2.4} />
      </Link>
      {tab(photos!)}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            tabItem,
            moreActive ? "text-accent" : "text-muted hover:text-fg",
            "data-[state=open]:text-fg",
          )}
        >
          <Ellipsis aria-hidden strokeWidth={1.75} />
          More
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" sideOffset={12} className="w-[220px]">
          {TAB_MORE_NAV.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
                <item.icon strokeWidth={1.75} />
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

/**
 * DESIGN.md §3 Floating quick-write — light circle with a dark pencil, bottom-left on every
 * admin page (56px desktop, 52px phone, sitting above the tab bar). Opens the new-entry form.
 */
export function QuickWriteButton() {
  const pathname = usePathname();
  if (isEntryFormPath(pathname)) return null;

  return (
    <Link
      href={NEW_ENTRY_HREF}
      aria-label="Quick write: new entry"
      title="Quick write"
      className={cn(
        "fixed z-30 flex items-center justify-center rounded-full bg-inverse text-inverse-ink shadow-fab",
        "transition-transform hover:scale-105 hover:text-inverse-ink",
        "bottom-[calc(100px+env(safe-area-inset-bottom))] left-5 size-[52px]",
        "lg:bottom-6 lg:left-6 lg:size-14",
      )}
    >
      <PenLine aria-hidden className="size-5 lg:size-[22px]" strokeWidth={2} />
    </Link>
  );
}
