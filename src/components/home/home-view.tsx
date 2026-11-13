import Link from "next/link";
import { Plus } from "lucide-react";

import { EntryCard, EntryRow } from "@/components/entries/entry-card";
import { DailyRow } from "./daily-row";
import { HomeHeader } from "./home-header";
import { NotesSection } from "./notes-section";
import { PageContainer } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { DailyCard } from "@/components/ui/daily-card";
import { EmptyState } from "@/components/ui/empty-state";
import { dailyPresentation, translationNotice } from "@/lib/daily";
import { calendarDate, greetingFor, homeDate, shortHomeDate } from "@/lib/dates";
import { NEW_ENTRY_HREF } from "@/lib/nav";
import type { DailyKind } from "@/types/database";
import type { HomeData } from "@/server/queries/home";
import type { PartnerKey } from "@/lib/site";

export type HomeViewer = {
  displayName: string;
  nickname: string;
  partner: PartnerKey;
  avatarUrl: string | null;
  timezone: string;
};

const SMALL_KINDS: Array<{ kind: Exclude<DailyKind, "scripture">; label: string }> = [
  { kind: "romance", label: "Romance" },
  { kind: "love", label: "Love" },
  { kind: "faith", label: "Faith" },
  { kind: "encouragement", label: "Encouragement" },
];

/** Home (/admin) — PRD §5.2, Nocturne "Home · desktop" and "Home · phone". Pure presentation. */
export function HomeView({ viewer, data, now }: { viewer: HomeViewer; data: HomeData; now: Date }) {
  const tz = viewer.timezone;

  const scripture = data.daily.scripture;
  const smallCards = SMALL_KINDS.flatMap(({ kind, label }) => {
    const item = data.daily[kind];
    return item ? [{ kind, label, item }] : [];
  });

  return (
    <PageContainer width="wide" className="gap-7 md:gap-10">
      <HomeHeader
        date={homeDate(now, tz)}
        shortDate={shortHomeDate(now, tz)}
        greeting={greetingFor(now, tz)}
        viewer={viewer}
        partner={data.partner}
        partnerLatest={data.partnerLatest}
        unreadFromPartner={data.received.unread}
        together={data.together}
      />

      {scripture ? (
        <DailyCard
          kind="scripture"
          text={scripture.text}
          {...dailyPresentation(scripture)}
          notice={data.bibleNotice ?? translationNotice(scripture.translation)}
        />
      ) : null}

      {smallCards.length > 0 ? (
        <DailyRow labels={smallCards.map((c) => c.label)}>
          {smallCards.map(({ kind, item }) => (
            <DailyCard key={kind} kind={kind} text={item.text} {...dailyPresentation(item)} />
          ))}
        </DailyRow>
      ) : null}

      {!scripture && smallCards.length === 0 ? (
        <EmptyState message="Today’s words will appear here once the daily library has items (Settings, Phase 11)." />
      ) : null}

      <NotesSection
        me={{ displayName: viewer.displayName, nickname: viewer.nickname, partner: viewer.partner }}
        partner={data.partner}
        received={data.received}
        sent={data.sent}
      />

      <Button asChild size="block" className="h-[60px] text-[17px]">
        <Link href={NEW_ENTRY_HREF}>
          <Plus aria-hidden strokeWidth={2} />
          New entry
        </Link>
      </Button>

      <section aria-labelledby="recently-heading" className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-4">
          <h2 id="recently-heading" className="serif m-0 text-[30px] leading-none md:text-[36px]">
            Recently
          </h2>
          {data.recent.length > 0 ? (
            <Link href="/admin/timeline" className="text-[15px] text-accent underline underline-offset-2">
              <span className="md:hidden">All</span>
              <span className="max-md:hidden">Open timeline →</span>
            </Link>
          ) : null}
        </div>

        {data.recent.length === 0 ? (
          <EmptyState
            message="Nothing written yet. The first entry starts the diary."
            action={
              <Button asChild variant="secondary">
                <Link href={NEW_ENTRY_HREF}>Write the first entry</Link>
              </Button>
            }
          />
        ) : (
          <>
            <ul className="m-0 hidden list-none grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 p-0 sm:grid">
              {data.recent.map((entry) => (
                <li key={entry.id}>
                  <EntryCard entry={entry} />
                </li>
              ))}
            </ul>
            <ul className="m-0 flex list-none flex-col gap-4 p-0 sm:hidden">
              {data.recent.map((entry) => (
                <li key={entry.id}>
                  <EntryRow entry={entry} todayIso={calendarDate(now, tz)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </PageContainer>
  );
}
