"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, ChevronDown, LogOut, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import type { NavItem } from "@/lib/nav";
import type { PartnerKey } from "@/lib/site";

/* ------------------------------------------------------------------ More (desktop nav) */

export function MoreMenu({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const activeChild = items.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[15px] transition-colors",
          "hover:bg-accent-soft hover:text-accent data-[state=open]:bg-accent-soft data-[state=open]:text-accent",
          activeChild ? "bg-accent-soft font-medium text-accent" : "text-fg-soft",
        )}
      >
        More <ChevronDown aria-hidden className="size-3.5" strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href} aria-current={active ? "page" : undefined}>
                <item.icon strokeWidth={1.75} />
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ Bell */

/** Notifications bell with the lavender unread badge. The list itself arrives in Phase 9. */
export function BellButton({ unreadCount }: { unreadCount: number }) {
  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="relative inline-flex size-11 items-center justify-center rounded-btn border border-border bg-raised text-fg-soft transition-colors hover:text-fg data-[state=open]:text-fg"
      >
        <Bell aria-hidden className="size-[18px]" strokeWidth={1.75} />
        {unreadCount > 0 ? (
          <span
            aria-hidden
            className="absolute -top-[5px] -right-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-lavender px-1 font-mono text-[11px] font-medium text-lavender-ink"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel className="eyebrow">Notifications</DropdownMenuLabel>
        <EmptyState variant="dashed" message="You’re all caught up." className="m-1.5 py-5" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ Account + sign out */

/**
 * Nocturne puts sign-out behind the avatar ("Account and sign out").
 * Sign out posts a form so it works without JavaScript and is CSRF-safe with SameSite cookies.
 */
export function AccountMenu({
  name,
  nickname,
  partner,
  avatarUrl,
}: {
  name: string;
  nickname: string;
  partner: PartnerKey;
  avatarUrl: string | null;
}) {
  const formRef = React.useRef<HTMLFormElement>(null);
  return (
    <>
      <form ref={formRef} action="/auth/signout" method="post" className="hidden" aria-hidden />
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="Account and sign out" className="rounded-full">
          <Avatar name={name} partner={partner} src={avatarUrl} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px]">
          <DropdownMenuLabel className="flex flex-col">
            <span className="text-[15px] font-medium text-fg">{name}</span>
            <span className="text-[13px] text-muted">“{nickname}”</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/admin/settings">
              <Settings strokeWidth={1.75} />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => formRef.current?.requestSubmit()}>
            <LogOut strokeWidth={1.75} />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
