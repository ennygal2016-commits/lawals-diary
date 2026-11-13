"use client";

import * as React from "react";

import { NotificationPrefs } from "@/app/admin/settings/notification-prefs";
import { type BellActions, NotificationBell } from "@/components/shell/notification-bell";
import { TopBar } from "@/components/shell/top-bar";
import { DEFAULT_PREFS } from "@/lib/notifications";
import type { NotificationFeed } from "@/server/queries/notifications";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const SAMPLE: NotificationFeed = {
  unread: 3,
  items: [
    {
      id: "n1",
      type: "note",
      payload: { from: "D_Gal", excerpt: "Don’t forget your umbrella. Also: so proud of you." },
      createdAt: minutesAgo(4),
      read: false,
    },
    {
      id: "n2",
      type: "entry",
      payload: { from: "D_Gal", title: "Rain on the train home", entry_id: "e1" },
      createdAt: minutesAgo(130),
      read: false,
    },
    {
      id: "n3",
      type: "application",
      payload: { reference: "FDN-2026-0042", application_id: "a1" },
      createdAt: minutesAgo(300),
      read: false,
    },
    {
      id: "n4",
      type: "comment",
      payload: {
        from: "D_Gal",
        title: "Sunday pancakes",
        entry_id: "e2",
        excerpt: "Attempt four next week?",
      },
      createdAt: minutesAgo(60 * 26),
      read: true,
    },
    {
      id: "n5",
      type: "note_reply",
      payload: { from: "D_Gal", excerpt: "Yes please — the lemon one." },
      createdAt: minutesAgo(60 * 50),
      read: true,
    },
  ],
};

/** Dev preview: the live bell with in-memory actions, and the Settings › Notifications control. */
export function NotificationsPreview({ empty }: { empty: boolean }) {
  const actions: BellActions = React.useMemo(
    () => ({ markRead: async () => ({ ok: true }), refresh: async () => null }),
    [],
  );
  const initial = empty ? { unread: 0, items: [] } : SAMPLE;
  return (
    <>
      <TopBar
        viewer={{
          displayName: "Afeez",
          nickname: "Kuleo",
          partner: "b",
          avatarUrl: null,
          unreadCount: initial.unread,
        }}
        bell={<NotificationBell userId="preview" initial={initial} actions={actions} realtime={false} />}
      />
      <section
        aria-labelledby="prefs-heading"
        className="mx-auto mt-10 flex max-w-[824px] flex-col gap-4 px-5 md:px-8"
      >
        <h2 id="prefs-heading" className="serif m-0 text-[30px]">
          Notifications (Settings)
        </h2>
        <div className="rounded-card border border-border bg-surface p-5 md:p-7">
          <NotificationPrefs
            initial={DEFAULT_PREFS}
            save={async () => ({ ok: true, message: "Email settings saved." })}
          />
        </div>
      </section>
    </>
  );
}
