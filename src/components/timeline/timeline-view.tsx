"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { PageHeader } from "@/components/shell/page";
import { InitialChip, VisibilityBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Chip, SegmentedFilter } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { CATEGORIES, MOODS, type Category, type Mood } from "@/lib/moods";
import { NEW_ENTRY_HREF } from "@/lib/nav";
import type { PartnerKey } from "@/lib/site";
import {
  DEFAULT_FILTERS,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MAX,
  type TimelineFilters,
  activeMoreFilters,
  groupByMonth,
  isFiltered,
  timelineDay,
  timelineQueryString,
} from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { loadTimeline } from "@/server/actions/timeline";
import type { TimelinePage, TimelineRow } from "@/server/queries/timeline";

type Partner = { name: string; partner: PartnerKey; count: number };
export type TimelineLoader = (filters: TimelineFilters, offset: number) => Promise<TimelinePage>;

const RAIL_DOT: Record<PartnerKey, string> = { a: "border-accent", b: "border-lavender" };

/**
 * /admin/timeline (PRD FR-19–FR-22, DESIGN.md §3 Timeline row). Every filter lives in the URL; the list below is
 * re-keyed on each URL change while the controls stay mounted, so typing in the search box never loses focus.
 */
export function TimelineView({
  filters: urlFilters,
  firstPage,
  stats,
  load = loadTimeline,
}: {
  filters: TimelineFilters;
  firstPage: TimelinePage;
  stats: { total: number; byPartner: Partner[] };
  load?: TimelineLoader;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = React.useTransition();
  // Controls show the latest REQUESTED filters straight away; the list follows the URL once it lands. Every change
  // is built on the latest request, so quick successive clicks never undo each other.
  const [filters, setFilters] = React.useState(urlFilters);
  const latest = React.useRef(urlFilters);
  const requested = React.useRef<string | null>(null);
  const urlQs = timelineQueryString(urlFilters);
  const [query, setQuery] = React.useState(urlFilters.q);
  const [moreOpen, setMoreOpen] = React.useState(activeMoreFilters(urlFilters) > 0);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // The URL changed: adopt it unless it is an older request still landing (back/forward is always adopted).
  React.useEffect(() => {
    if (requested.current === null || requested.current === urlQs) {
      requested.current = null;
      latest.current = urlFilters;
      setFilters(urlFilters);
    }
    // urlQs captures every field of urlFilters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQs]);

  const navigate = React.useCallback(
    (next: TimelineFilters) => {
      latest.current = next;
      setFilters(next);
      requested.current = timelineQueryString(next);
      startTransition(() => router.replace(`${pathname}${timelineQueryString(next)}`, { scroll: false }));
    },
    [pathname, router],
  );

  // Debounced search (300 ms).
  React.useEffect(() => {
    if (query.trim() === latest.current.q.trim()) return;
    const t = setTimeout(() => navigate({ ...latest.current, q: query }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, filters.q, navigate]);

  // Back/forward changed the URL: show its query unless the person is typing.
  React.useEffect(() => {
    if (document.activeElement !== searchRef.current) setQuery(urlFilters.q);
  }, [urlFilters.q]);

  // ⌘K / Ctrl+K focuses the search.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [shortcut, setShortcut] = React.useState("⌘K");
  React.useEffect(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.platform)) setShortcut("Ctrl K");
  }, []);

  const set = (change: Partial<TimelineFilters> | ((f: TimelineFilters) => Partial<TimelineFilters>)) =>
    navigate({ ...latest.current, ...(typeof change === "function" ? change(latest.current) : change) });
  const toggleIn = <T extends string>(list: T[], value: T) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  const moreCount = activeMoreFilters(filters);

  return (
    <>
      <PageHeader
        title="Timeline"
        meta={[
          `${stats.total.toLocaleString("en-CA")} ${stats.total === 1 ? "entry" : "entries"}`,
          ...stats.byPartner.map((p) => `${p.name} ${p.count.toLocaleString("en-CA")}`),
        ].join(" · ")}
      />

      <div className="flex flex-col gap-4">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
          <label htmlFor="timeline-search" className="visually-hidden">
            Search entries
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted"
            strokeWidth={1.75}
          />
          <input
            ref={searchRef}
            id="timeline-search"
            type="search"
            value={query}
            maxLength={SEARCH_MAX}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.preventDefault();
                setQuery("");
              }
            }}
            placeholder="Search titles, words, places…"
            autoComplete="off"
            className="h-[52px] w-full rounded-btn-lg border border-border bg-surface pr-20 pl-11 text-[15px] text-fg transition-colors placeholder:text-faint hover:border-border-strong [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              className="absolute top-1/2 right-3 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-fg"
            >
              <X aria-hidden className="size-4" />
            </button>
          ) : (
            <kbd
              aria-hidden
              className="absolute top-1/2 right-4 hidden -translate-y-1/2 rounded-[6px] border border-border-strong px-1.5 py-0.5 font-mono text-[11px] text-muted md:block"
            >
              {shortcut}
            </kbd>
          )}
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedFilter
            label="Visibility"
            options={[
              { value: "all", label: "All" },
              { value: "private", label: "Private" },
              { value: "public", label: "Public" },
            ]}
            value={filters.visibility}
            onValueChange={(visibility) => set({ visibility })}
          />
          <Chip
            dashed
            selected={moreOpen}
            aria-expanded={moreOpen}
            aria-controls="timeline-more-filters"
            aria-pressed={undefined}
            count={moreCount || undefined}
            onClick={() => setMoreOpen((v) => !v)}
          >
            <SlidersHorizontal aria-hidden strokeWidth={1.75} />
            More filters
          </Chip>
        </div>

        <div
          id="timeline-more-filters"
          hidden={!moreOpen}
          className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 md:p-6"
        >
          <FilterRow label="Author" id="tf-author">
            <Chip selected={filters.author === null} onClick={() => set({ author: null })}>
              Both
            </Chip>
            {stats.byPartner.map((p) => (
              <Chip
                key={p.partner}
                selected={filters.author === p.partner}
                onClick={() => set((f) => ({ author: f.author === p.partner ? null : p.partner }))}
              >
                {p.name}
              </Chip>
            ))}
          </FilterRow>

          <FilterRow label="Mood" id="tf-mood">
            {MOODS.map((m) => (
              <Chip
                key={m.value}
                selected={filters.moods.includes(m.value)}
                onClick={() => set((f) => ({ moods: toggleIn<Mood>(f.moods, m.value) }))}
              >
                <span aria-hidden className="size-2 rounded-full" style={{ background: m.color }} />
                {m.label}
              </Chip>
            ))}
          </FilterRow>

          <FilterRow label="Category" id="tf-category">
            {CATEGORIES.map((c) => (
              <Chip
                key={c.value}
                selected={filters.categories.includes(c.value)}
                onClick={() => set((f) => ({ categories: toggleIn<Category>(f.categories, c.value) }))}
              >
                {c.label}
              </Chip>
            ))}
          </FilterRow>

          <div className="grid grid-cols-2 gap-3 md:max-w-[420px]">
            <Field label="From">
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={filters.from ?? ""}
                  max={filters.to ?? undefined}
                  onChange={(e) => set({ from: e.target.value || null })}
                />
              )}
            </Field>
            <Field label="To">
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={filters.to ?? ""}
                  min={filters.from ?? undefined}
                  onChange={(e) => set({ to: e.target.value || null })}
                />
              )}
            </Field>
          </div>

          <FilterRow label="Photos" id="tf-photos">
            <Chip selected={filters.hasPhotos === null} onClick={() => set({ hasPhotos: null })}>
              Any
            </Chip>
            <Chip selected={filters.hasPhotos === true} onClick={() => set({ hasPhotos: true })}>
              Has photos
            </Chip>
            <Chip selected={filters.hasPhotos === false} onClick={() => set({ hasPhotos: false })}>
              No photos
            </Chip>
          </FilterRow>

          {moreCount > 0 ? (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  set({ author: null, moods: [], categories: [], from: null, to: null, hasPhotos: null })
                }
              >
                Clear these filters
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <TimelineList
        key={urlQs}
        filters={urlFilters}
        firstPage={firstPage}
        load={load}
        pending={pending}
        noEntriesAtAll={stats.total === 0}
        onClear={() => {
          setQuery("");
          navigate(DEFAULT_FILTERS);
        }}
      />
    </>
  );
}

function FilterRow({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span id={id} className="eyebrow">
        {label}
      </span>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}

function TimelineList({
  filters,
  firstPage,
  load,
  pending,
  noEntriesAtAll,
  onClear,
}: {
  filters: TimelineFilters;
  firstPage: TimelinePage;
  load: TimelineLoader;
  pending: boolean;
  noEntriesAtAll: boolean;
  onClear: () => void;
}) {
  const [rows, setRows] = React.useState<TimelineRow[]>(firstPage.rows);
  const [more, setMore] = React.useState(firstPage.more);
  const [loading, setLoading] = React.useState(false);
  const loadingRef = React.useRef(false);
  const sentinel = React.useRef<HTMLDivElement>(null);

  const loadMore = React.useCallback(async () => {
    if (loadingRef.current || !more) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const next = await load(filters, rows.length);
      setRows((list) => {
        const seen = new Set(list.map((r) => r.id));
        return [...list, ...next.rows.filter((r) => !seen.has(r.id))];
      });
      setMore(next.more);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [filters, load, more, rows.length]);

  React.useEffect(() => {
    const el = sentinel.current;
    if (!el || !more) return;
    const observer = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && void loadMore(),
      {
        rootMargin: "800px 0px",
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, more]);

  const groups = groupByMonth(rows);
  const filtered = isFiltered(filters);

  return (
    <div
      aria-busy={pending || loading}
      className={cn("flex flex-col gap-9 transition-opacity", pending && "opacity-60")}
    >
      <p className="visually-hidden" aria-live="polite">
        {filtered ? `${firstPage.total} ${firstPage.total === 1 ? "entry matches" : "entries match"}` : ""}
      </p>
      {filtered && rows.length > 0 ? (
        <p className="-mt-4 mb-0 font-mono text-[13px] text-muted" aria-hidden>
          {firstPage.total} {firstPage.total === 1 ? "result" : "results"}
        </p>
      ) : null}

      {rows.length === 0 ? (
        noEntriesAtAll && !filtered ? (
          <EmptyState
            message="Nothing written yet. Entries appear here, newest first, grouped by month."
            action={
              <Button asChild variant="secondary">
                <Link href={NEW_ENTRY_HREF}>Write the first entry</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            variant="dashed"
            message={
              filters.q.trim() ? `No entries match “${filters.q.trim()}”.` : "No entries match these filters."
            }
            action={
              <Button variant="secondary" onClick={onClear}>
                Clear search and filters
              </Button>
            }
          />
        )
      ) : (
        groups.map((group) => (
          <section key={group.key} aria-labelledby={`month-${group.key}`} className="flex flex-col">
            <h2
              id={`month-${group.key}`}
              className="serif m-0 flex items-baseline gap-3 border-b border-divider pb-4 text-[30px] leading-none md:text-[34px]"
            >
              {group.label}
              <span className="font-mono text-[12px] text-muted uppercase">
                {group.count} {group.count === 1 ? "entry" : "entries"}
              </span>
            </h2>
            <ol className="relative m-0 list-none p-0 before:absolute before:top-0 before:bottom-0 before:left-[8px] before:w-px before:bg-border-strong">
              {group.rows.map((row) => (
                <TimelineRowItem key={row.id} row={row} />
              ))}
            </ol>
          </section>
        ))
      )}

      <div ref={sentinel} aria-hidden className="h-px" />
      {more ? (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => void loadMore()} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function TimelineRowItem({ row }: { row: TimelineRow }) {
  const category = CATEGORIES.find((c) => c.value === row.category)?.label ?? row.category;
  return (
    <li className="relative flex items-center gap-4 border-b border-divider-soft py-4 pl-7">
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 left-[3px] size-[11px] -translate-y-1/2 rounded-full border-2 bg-bg",
          RAIL_DOT[row.author.partner],
        )}
      />
      <div className="size-16 shrink-0 overflow-hidden rounded-[10px] bg-placeholder-tint">
        {row.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
          <img src={row.thumbUrl} alt="" loading="lazy" className="size-full object-cover" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="m-0 truncate text-[17px] leading-snug font-medium">
          <Link
            href={`/admin/entries/${row.id}`}
            className="text-fg no-underline after:absolute after:inset-0 hover:text-accent"
          >
            {row.title}
          </Link>
        </h3>
        <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
          <InitialChip name={row.author.name} partner={row.author.partner} size="sm" />
          <span className="font-mono uppercase">{timelineDay(row.entryDate)}</span>
          <span aria-hidden>·</span>
          <span>{category}</span>
          <span aria-hidden>·</span>
          <span>
            {row.commentCount} {row.commentCount === 1 ? "comment" : "comments"}
          </span>
        </p>
      </div>
      <VisibilityBadge visibility={row.visibility} className="relative shrink-0 max-sm:hidden" />
      <VisibilityBadge
        visibility={row.visibility}
        variant="icon"
        className="relative shrink-0 bg-raised sm:hidden"
      />
    </li>
  );
}
