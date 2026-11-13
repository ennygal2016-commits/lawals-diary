"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceStrict } from "date-fns";
import {
  Bell,
  BookOpen,
  GraduationCap,
  MessageCircle,
  Reply,
  StickyNote,
  type LucideIcon,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { type NotificationType, describeNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { markNotificationsRead, refreshNotifications } from "@/server/actions/notifications";
import type { FeedItem, NotificationFeed } from "@/server/queries/notifications";

const FEED_SIZE = 20;

const ICONS: Record<NotificationType, LucideIcon> = {
  entry: BookOpen,
  comment: MessageCircle,
  note: StickyNote,
  note_reply: Reply,
  application: GraduationCap,
};

export type BellActions = {
  markRead: (ids?: string[]) => Promise<{ ok: boolean }>;
  refresh: () => Promise<NotificationFeed | null>;
};

const serverActions: BellActions = { markRead: markNotificationsRead, refresh: refreshNotifications };

type RealtimeRow = {
  id: string;
  type: NotificationType;
  payload: FeedItem["payload"];
  created_at: string;
  read_at: string | null;
};

/**
 * The bell (PRD FR-40): unread badge, the latest 20, "Mark all read". Live via Supabase Realtime (postgres_changes
 * on public.notifications, which applies RLS) with a refresh on window focus as the fallback.
 */
export function NotificationBell({
  userId,
  initial,
  actions = serverActions,
  realtime = true,
}: {
  userId: string;
  initial: NotificationFeed;
  actions?: BellActions;
  realtime?: boolean;
}) {
  const [items, setItems] = React.useState<FeedItem[]>(initial.items);
  const [unread, setUnread] = React.useState(initial.unread);
  const [announce, setAnnounce] = React.useState("");
  const [now, setNow] = React.useState(() => new Date());

  const apply = React.useCallback((feed: NotificationFeed | null) => {
    if (!feed) return;
    setItems(feed.items);
    setUnread(feed.unread);
  }, []);

  // Live updates.
  React.useEffect(() => {
    if (!realtime || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    let cleanup = () => {};
    let cancelled = false;
    void import("@/lib/supabase/browser").then(({ createClient }) => {
      if (cancelled) return;
      const supabase = createClient();
      const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          ({ new: row }) => {
            const r = row as RealtimeRow;
            const item: FeedItem = {
              id: r.id,
              type: r.type,
              payload: r.payload,
              createdAt: r.created_at,
              read: !!r.read_at,
            };
            setItems((list) =>
              list.some((i) => i.id === item.id) ? list : [item, ...list].slice(0, FEED_SIZE),
            );
            if (!item.read) setUnread((n) => n + 1);
            setAnnounce(`New: ${describeNotification(item.type, item.payload).text}`);
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          ({ new: row }) => {
            const r = row as RealtimeRow;
            setItems((list) => list.map((i) => (i.id === r.id ? { ...i, read: !!r.read_at } : i)));
          },
        )
        .subscribe();
      cleanup = () => void supabase.removeChannel(channel);
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [realtime, userId]);

  // Fallback: catch up when the tab comes back.
  React.useEffect(() => {
    const onFocus = () => void actions.refresh().then(apply);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [actions, apply]);

  async function markAll() {
    setItems((list) => list.map((i) => ({ ...i, read: true })));
    setUnread(0);
    await actions.markRead();
  }

  function open(item: FeedItem) {
    if (item.read) return;
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, read: true } : i)));
    setUnread((n) => Math.max(0, n - 1));
    void actions.markRead([item.id]);
  }

  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <>
      <p className="visually-hidden" aria-live="polite">
        {announce}
      </p>
      <DropdownMenu onOpenChange={(o) => o && setNow(new Date())}>
        <DropdownMenuTrigger
          aria-label={label}
          className="relative inline-flex size-11 items-center justify-center rounded-btn border border-border bg-raised text-fg-soft transition-colors hover:text-fg data-[state=open]:text-fg"
        >
          <Bell aria-hidden className="size-[18px]" strokeWidth={1.75} />
          {unread > 0 ? (
            <span
              aria-hidden
              data-testid="bell-badge"
              className="absolute -top-[5px] -right-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-lavender px-1 font-mono text-[11px] font-medium text-lavender-ink"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[360px] max-w-[calc(100vw-1.5rem)] p-0">
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
            <DropdownMenuLabel className="eyebrow p-0">Notifications</DropdownMenuLabel>
            {unread > 0 ? (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  void markAll();
                }}
                className="h-8 rounded-full px-3 text-[13px] text-accent"
              >
                Mark all read
              </DropdownMenuItem>
            ) : null}
          </div>
          <DropdownMenuSeparator className="m-0" />
          {items.length === 0 ? (
            <EmptyState variant="dashed" message="You’re all caught up." className="m-3 py-5" />
          ) : (
            <div className="max-h-[min(70dvh,480px)] overflow-y-auto p-1.5">
              {items.map((item) => {
                const d = describeNotification(item.type, item.payload);
                const Icon = ICONS[item.type];
                return (
                  <DropdownMenuItem key={item.id} asChild onSelect={() => open(item)}>
                    <Link
                      href={d.href}
                      className={cn(
                        "flex h-auto items-start gap-3 rounded-[10px] px-2.5 py-2.5 whitespace-normal no-underline",
                        item.read ? "text-fg-soft" : "text-fg",
                      )}
                    >
                      <span
                        aria-hidden
                        className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-raised text-muted"
                      >
                        <Icon className="size-4" strokeWidth={1.75} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={cn("text-[14px] leading-snug", !item.read && "font-medium")}>
                          {d.text}
                        </span>
                        {d.excerpt ? (
                          <span className="line-clamp-2 text-[13px] text-muted">“{d.excerpt}”</span>
                        ) : null}
                        <span className="font-mono text-[11px] text-faint uppercase">
                          {formatDistanceStrict(new Date(item.createdAt), now, { addSuffix: true })}
                        </span>
                      </span>
                      {item.read ? null : (
                        <span className="mt-2 size-2 shrink-0 rounded-full bg-lavender">
                          <span className="visually-hidden">Unread</span>
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
