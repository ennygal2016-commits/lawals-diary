"use client";

import type * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/shell/wordmark";
import { AccountMenu, BellButton, MoreMenu } from "@/components/shell/header-actions";
import { MORE_NAV, NEW_ENTRY_HREF, PRIMARY_NAV, isActive, isEntryFormPath } from "@/lib/nav";
import type { PartnerKey } from "@/lib/site";

export type ShellViewer = {
  displayName: string;
  nickname: string;
  partner: PartnerKey;
  avatarUrl: string | null;
  unreadCount: number;
};

/**
 * DESIGN.md §3 Top bar. Desktop (≥1024px): wordmark · nav pills · New entry · bell · avatar,
 * sticky with a blurred page-colour background. Below 1024px the nav moves to the bottom tab bar
 * and the header keeps only the wordmark, bell and avatar (Nocturne "Home · phone").
 */
export function TopBar({ viewer, bell }: { viewer: ShellViewer; bell?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <header
      className={cn(
        "z-40 border-divider lg:sticky lg:top-0 lg:border-b lg:bg-[rgba(14,12,20,0.78)] lg:backdrop-blur-[16px]",
        // Phone entry form is full-screen: close X + save status only (Nocturne "New entry · phone").
        isEntryFormPath(pathname) && "max-lg:hidden",
      )}
    >
      <div className="mx-auto flex max-w-[1304px] items-center justify-between gap-4 px-5 pt-5 lg:justify-start lg:gap-7 lg:px-8 lg:py-3">
        <Wordmark href="/admin" />

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2.5 text-[15px] no-underline transition-colors",
                  active
                    ? "bg-accent-soft font-medium text-accent hover:text-accent"
                    : "text-fg-soft hover:bg-accent-soft hover:text-accent",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <MoreMenu items={MORE_NAV} pathname={pathname} />
        </nav>

        <div className="flex items-center gap-2 lg:gap-2.5">
          <Button asChild className="hidden lg:inline-flex">
            <Link href={NEW_ENTRY_HREF}>
              <Plus aria-hidden strokeWidth={2.2} />
              New entry
            </Link>
          </Button>
          {bell ?? <BellButton unreadCount={viewer.unreadCount} />}
          <AccountMenu
            name={viewer.displayName}
            nickname={viewer.nickname}
            partner={viewer.partner}
            avatarUrl={viewer.avatarUrl}
          />
        </div>
      </div>
    </header>
  );
}
