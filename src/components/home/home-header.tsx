import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { PartnerKey } from "@/lib/site";
import type { HomeData } from "@/server/queries/home";

const partnerText: Record<PartnerKey, string> = { a: "text-accent", b: "text-lavender" };

/**
 * PRD FR-5 / Nocturne "Home": live dot + date eyebrow, the greeting with the viewer's nickname (italic, partner
 * colour), a line about the partner, and on the right the days-together ring — or the viewer's avatar until an
 * anniversary is set in Settings.
 */
export function HomeHeader({
  date,
  shortDate,
  greeting,
  viewer,
  partner,
  partnerLatest,
  unreadFromPartner,
  together,
}: {
  date: string;
  shortDate: string;
  greeting: string;
  viewer: { displayName: string; nickname: string; partner: PartnerKey; avatarUrl: string | null };
  partner: HomeData["partner"];
  partnerLatest: HomeData["partnerLatest"];
  unreadFromPartner: number;
  together: HomeData["together"];
}) {
  return (
    <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col gap-3 md:gap-4">
        <p className="eyebrow m-0 flex items-center gap-2.5">
          <span aria-hidden className="relative flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-success opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          <span className="max-md:hidden">{date}</span>
          <span className="md:hidden">
            {shortDate}
            {together ? ` · Day ${together.days.toLocaleString("en-CA")}` : null}
          </span>
        </p>

        <h1 className="serif m-0 text-[42px] leading-[1.02] font-normal md:text-[clamp(44px,6vw,72px)]">
          {greeting},<br className="md:hidden" />{" "}
          <em className={cn("whitespace-nowrap", partnerText[viewer.partner])}>{viewer.nickname}.</em>
        </h1>

        <PartnerLine partner={partner} latest={partnerLatest} unread={unreadFromPartner} />
      </div>

      {together ? (
        <DaysTogether {...together} />
      ) : (
        <Avatar
          name={viewer.displayName}
          partner={viewer.partner}
          src={viewer.avatarUrl}
          size="lg"
          className="hidden size-24 text-3xl md:inline-flex"
        />
      )}
    </header>
  );
}

function PartnerLine({
  partner,
  latest,
  unread,
}: {
  partner: HomeData["partner"];
  latest: HomeData["partnerLatest"];
  unread: number;
}) {
  // Names, never pronouns (CLAUDE.md conventions).
  const name = partner.displayName;
  const noteBit = unread > 0 ? (unread === 1 ? "a note" : `${unread} notes`) : null;

  if (!latest && !noteBit) {
    return <p className="m-0 text-[15px] text-muted md:text-base">Here’s today, for the two of you.</p>;
  }
  return (
    <p className="m-0 text-[15px] text-muted md:text-base">
      {latest ? (
        <>
          {name} wrote {latest.ago} —{" "}
          <Link href={`/admin/entries/${latest.id}`} className="text-accent underline underline-offset-2">
            “{latest.title}”
          </Link>
          .{noteBit ? ` ${name} also left you ${noteBit}.` : null}
        </>
      ) : (
        <>
          {name} left you {noteBit}.
        </>
      )}
    </p>
  );
}

function DaysTogether({ days, next, progress }: NonNullable<HomeData["together"]>) {
  const r = 38;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="hidden items-center gap-5 rounded-panel border border-border bg-surface px-6 py-5 md:flex">
      <svg viewBox="0 0 88 88" aria-hidden className="size-[72px] shrink-0 -rotate-90 md:size-[88px]">
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--border-strong)" strokeWidth="3" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(Math.max(progress, 0), 1))}
        />
        <circle cx="44" cy="44" r="28" fill="none" stroke="var(--border-muted)" strokeDasharray="1 4" />
      </svg>
      <div className="flex flex-col gap-1">
        <span className="serif text-[36px] leading-none md:text-[40px]">{days.toLocaleString("en-CA")}</span>
        <span className="eyebrow">Days together</span>
        {next ? <span className="text-[13px] text-fg-soft">{next}</span> : null}
      </div>
    </div>
  );
}
