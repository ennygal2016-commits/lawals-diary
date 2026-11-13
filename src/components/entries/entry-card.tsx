import Link from "next/link";

import { InitialChip, MoodDot, VisibilityBadge } from "@/components/ui/badges";
import { entryDay } from "@/lib/dates";
import { CATEGORIES } from "@/lib/moods";
import { cn } from "@/lib/utils";
import type { HomeEntry } from "@/server/queries/home";

/** Photo-area tints until real covers arrive with the photo pipeline (Phase 6). */
const CATEGORY_TINT: Record<HomeEntry["category"], string> = {
  everyday: "bg-placeholder-tint",
  date_night: "bg-accent-soft",
  travel: "bg-selected",
  milestone: "bg-lavender-soft",
  food: "bg-note",
  family: "bg-raised",
  other: "bg-overlay",
};

function categoryLabel(value: HomeEntry["category"]) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/** DESIGN.md §3 Entry card (Home "Recently"): 180 px photo area + visibility pill, serif title, author, date, mood. */
export function EntryCard({ entry }: { entry: HomeEntry }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface transition-colors hover:border-border-strong">
      <div className={cn("relative h-[180px]", CATEGORY_TINT[entry.category])}>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-[12px] text-faint uppercase">
          {categoryLabel(entry.category)}
        </span>
        <VisibilityBadge
          visibility={entry.visibility}
          variant="overlay"
          className="absolute bottom-3 left-3"
        />
      </div>
      <div className="flex flex-col gap-3 px-5 pt-4 pb-5">
        <h3 className="serif m-0 text-[24px] leading-tight">
          <Link href={`/admin/entries/${entry.id}`} className="text-fg after:absolute after:inset-0">
            {entry.title}
          </Link>
        </h3>
        <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
          <span className="flex items-center gap-2">
            <InitialChip name={entry.author.name} partner={entry.author.partner} />
            <span className="font-mono uppercase">{entryDay(entry.entryDate)}</span>
          </span>
          {entry.mood ? <MoodDot mood={entry.mood} /> : null}
        </div>
      </div>
    </article>
  );
}

/** Phone "Recently": compact rows (Nocturne "Home · phone"). */
export function EntryRow({ entry, todayIso }: { entry: HomeEntry; todayIso: string }) {
  const day = entry.entryDate === todayIso ? "Today" : entryDay(entry.entryDate);
  return (
    <article className="relative flex items-center gap-4">
      <div aria-hidden className={cn("size-16 shrink-0 rounded-tile", CATEGORY_TINT[entry.category])} />
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="serif m-0 truncate text-[20px] leading-tight">
          <Link href={`/admin/entries/${entry.id}`} className="text-fg after:absolute after:inset-0">
            {entry.title}
          </Link>
        </h3>
        <p className="m-0 flex flex-wrap items-center gap-x-2 font-mono text-[12px] text-muted uppercase">
          <span>{entry.author.name}</span>
          <span aria-hidden>·</span>
          <span>{day}</span>
          {entry.mood ? (
            <>
              <span aria-hidden>·</span>
              <MoodDot mood={entry.mood} />
            </>
          ) : null}
          <span className="visually-hidden">· {entry.visibility === "public" ? "Public" : "Private"}</span>
        </p>
      </div>
    </article>
  );
}
