import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HomeView, type HomeViewer } from "@/components/home/home-view";
import { BottomTabBar, QuickWriteButton } from "@/components/shell/bottom-nav";
import { TopBar } from "@/components/shell/top-bar";
import { ToastProvider } from "@/components/ui/toast";
import { type DailyItem, pickDaily } from "@/lib/daily";
import { calendarDate, noteStamp, togetherStats } from "@/lib/dates";
import type { DailyKind } from "@/types/database";
import type { HomeData } from "@/server/queries/home";
import { DAILY_CONTENT } from "@/lib/daily-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Home preview", robots: { index: false, follow: false } };

/**
 * Dev tool: Home with sample data, for comparing against docs/screens without a database.
 * ?empty=1 shows the empty states. Same gate as /styleguide.
 */
export default async function HomePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();
  const empty = (await searchParams).empty === "1";

  const now = new Date();
  const tz = "America/Toronto";
  const viewer: HomeViewer = {
    displayName: "Afeez",
    nickname: "Kuleo",
    partner: "b",
    avatarUrl: null,
    timezone: tz,
  };
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
  const today = calendarDate(now, tz);
  const daysAgo = (d: number) => calendarDate(new Date(now.getTime() - d * 86_400_000), tz);

  const items: DailyItem[] = DAILY_CONTENT.map((item, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    kind: item.kind,
    text: item.text,
    attribution: item.attribution ?? null,
    reference: item.reference ?? null,
    translation: item.translation ?? null,
    active: true,
  }));
  const daily: HomeData["daily"] = {};
  for (const kind of ["scripture", "romance", "love", "faith", "encouragement"] as DailyKind[]) {
    const pick = pickDaily(kind, now, items);
    if (pick) daily[kind] = pick;
  }

  const nurat = { name: "Nurat", partner: "a" as const };
  const afeez = { name: "Afeez", partner: "b" as const };
  const data: HomeData = {
    partner: { userId: "sample", displayName: "Nurat", nickname: "D_Gal", partner: "a" },
    daily,
    partnerLatest: empty ? null : { id: "sample-1", title: "Rain on the train home", ago: "2 hours ago" },
    together: empty ? null : togetherStats("2023-05-08", today),
    bibleNotice: "King James Version — public domain.",
    received: empty
      ? { notes: [], total: 0, unread: 0 }
      : {
          total: 4,
          unread: 1,
          notes: [
            {
              id: "n1",
              body: "Don’t forget your umbrella. Also: I’m so proud of how you handled today.",
              stamp: noteStamp(hoursAgo(5), now, tz),
              unread: true,
              reply: null,
            },
            {
              id: "n2",
              body: "Dinner at 7? I’ll bring dessert.",
              stamp: noteStamp(hoursAgo(30), now, tz),
              unread: false,
              reply: { body: "Yes please — the lemon one.", stamp: noteStamp(hoursAgo(29), now, tz) },
            },
          ],
        },
    sent: empty
      ? { notes: [], total: 0, answered: 0 }
      : {
          total: 6,
          answered: 5,
          notes: [
            {
              id: "s1",
              body: "Thank you for this morning. Coffee was perfect.",
              stamp: noteStamp(hoursAgo(26), now, tz),
              unread: false,
              reply: { body: "Anytime, Kuleo.", stamp: noteStamp(hoursAgo(25), now, tz) },
            },
          ],
        },
    recent: empty
      ? []
      : [
          {
            id: "1",
            title: "Rain on the train home",
            entryDate: today,
            mood: "calm",
            category: "everyday",
            visibility: "private",
            author: nurat,
          },
          {
            id: "2",
            title: "Sunday pancakes, attempt three",
            entryDate: daysAgo(2),
            mood: "funny",
            category: "food",
            visibility: "private",
            author: afeez,
          },
          {
            id: "3",
            title: "The long walk along the lake",
            entryDate: daysAgo(3),
            mood: "loved",
            category: "date_night",
            visibility: "public",
            author: nurat,
          },
          {
            id: "4",
            title: "Church picnic",
            entryDate: daysAgo(5),
            mood: "happy",
            category: "family",
            visibility: "public",
            author: afeez,
          },
          {
            id: "5",
            title: "First snow",
            entryDate: daysAgo(8),
            mood: "excited",
            category: "everyday",
            visibility: "private",
            author: nurat,
          },
          {
            id: "6",
            title: "Three years",
            entryDate: daysAgo(12),
            mood: "bittersweet",
            category: "milestone",
            visibility: "private",
            author: afeez,
          },
        ],
  };

  return (
    <ToastProvider>
      <TopBar
        viewer={{
          displayName: "Afeez",
          nickname: "Kuleo",
          partner: "b",
          avatarUrl: null,
          unreadCount: empty ? 0 : 3,
        }}
      />
      <main id="main" className="pb-40 lg:pb-28">
        <HomeView viewer={viewer} data={data} now={now} />
      </main>
      <QuickWriteButton />
      <BottomTabBar />
    </ToastProvider>
  );
}
