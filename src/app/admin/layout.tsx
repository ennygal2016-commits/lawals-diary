import type { Metadata } from "next";

import { TopBar } from "@/components/shell/top-bar";
import { BottomTabBar, QuickWriteButton } from "@/components/shell/bottom-nav";
import { NotificationBell } from "@/components/shell/notification-bell";
import { OfflineBanner } from "@/components/shell/service-worker";
import { SkipLink } from "@/components/shell/skip-link";
import { ToastProvider } from "@/components/ui/toast";
import { getNotificationFeed } from "@/server/queries/notifications";
import { getViewer } from "@/server/queries/viewer";

// Belt and braces: middleware and next.config.ts also send "X-Robots-Tag: noindex" for /admin/**.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const feed = await getNotificationFeed(viewer.userId);

  return (
    <ToastProvider>
      <SkipLink />
      <OfflineBanner />
      <TopBar
        viewer={{
          displayName: viewer.displayName,
          nickname: viewer.nickname,
          partner: viewer.partner,
          avatarUrl: viewer.avatarUrl,
          unreadCount: feed.unread,
        }}
        bell={<NotificationBell userId={viewer.userId} initial={feed} />}
      />
      <main id="main" tabIndex={-1} className="pb-40 outline-none lg:pb-28">
        {children}
      </main>
      <QuickWriteButton />
      <BottomTabBar />
    </ToastProvider>
  );
}
