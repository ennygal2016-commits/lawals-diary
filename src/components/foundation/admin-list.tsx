import Link from "next/link";
import { GraduationCap, Search } from "lucide-react";

import { PageHeader } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  type AdminFilters,
  APPLICATION_STATUSES,
  SCHOOL_LEVELS,
  levelLabel,
} from "@/lib/validation/foundation";
import type { ApplicationListItem, StatusCounts } from "@/server/queries/foundation";
import { StatusPill, formatCad } from "./status-pill";

export const FOUNDATION_INTRO =
  "Scholarship and school fees applications from the public page. Only the two of you can see them.";

function hrefFor(base: string, f: AdminFilters, change: Partial<AdminFilters>) {
  const next = { ...f, ...change };
  const p = new URLSearchParams();
  if (next.status !== "all") p.set("status", next.status);
  if (next.q) p.set("q", next.q);
  if (next.level !== "all") p.set("level", next.level);
  if (next.page > 1) p.set("page", String(next.page));
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

const chip =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium no-underline transition-colors";

/**
 * /admin/foundation (PRD FR-34, DESIGN.md §4): intro, status chips with live counts, search + level + Search,
 * the list or the empty state. Server-rendered; filters are plain links and a GET form, so it works without JS.
 */
export function FoundationAdminList({
  base = "/admin/foundation",
  filters,
  items,
  counts,
  total,
  more,
}: {
  base?: string;
  filters: AdminFilters;
  items: ApplicationListItem[];
  counts: StatusCounts;
  total: number;
  more: boolean;
}) {
  const searching = Boolean(filters.q) || filters.level !== "all";

  return (
    <>
      <PageHeader
        title="Foundation"
        meta={`${counts.all} ${counts.all === 1 ? "application" : "applications"}`}
      />
      <p className="-mt-2 mb-0 text-[16px] leading-relaxed text-fg-soft md:-mt-4">{FOUNDATION_INTRO}</p>

      <nav aria-label="Status" className="flex flex-wrap gap-2">
        {[{ value: "all" as const, label: "All" }, ...APPLICATION_STATUSES].map((s) => {
          const active = filters.status === s.value;
          return (
            <Link
              key={s.value}
              href={hrefFor(base, filters, { status: s.value, page: 1 })}
              aria-current={active ? "page" : undefined}
              className={cn(
                chip,
                active
                  ? "border-inverse bg-inverse text-inverse-ink"
                  : "border-border-strong text-fg-soft hover:border-border-dashed hover:text-fg",
              )}
            >
              {s.label}
              <span className={cn("font-mono text-[13px]", active ? "text-inverse-ink" : "text-muted")}>
                ({counts[s.value]})
              </span>
            </Link>
          );
        })}
      </nav>

      <form role="search" method="get" action={base} className="flex flex-col gap-3 sm:flex-row">
        {filters.status !== "all" ? <input type="hidden" name="status" value={filters.status} /> : null}
        <label htmlFor="fdn-q" className="visually-hidden">
          Search by name, reference or school
        </label>
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted"
            strokeWidth={1.75}
          />
          <input
            id="fdn-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            maxLength={80}
            placeholder="Name, reference or school"
            className="h-12 w-full rounded-input border border-border bg-raised pr-3 pl-11 text-[15px] text-fg placeholder:text-faint"
          />
        </div>
        <label htmlFor="fdn-level" className="visually-hidden">
          Level
        </label>
        <select
          id="fdn-level"
          name="level"
          defaultValue={filters.level}
          className="h-12 rounded-input border border-border bg-raised px-3 text-[15px] text-fg sm:w-[180px]"
        >
          <option value="all">All levels</option>
          {SCHOOL_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary" className="h-12">
          Search
        </Button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          variant="dashed"
          icon={GraduationCap}
          message={
            counts.all === 0 && !searching
              ? "No applications yet"
              : searching
                ? "No applications match this search."
                : "No applications with this status."
          }
          action={
            searching || filters.status !== "all" ? (
              <Button asChild variant="secondary">
                <Link href={base}>Show all applications</Link>
              </Button>
            ) : (
              <Button asChild variant="secondary">
                <Link href="/foundation">Open the public form</Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <p className="m-0 font-mono text-[13px] text-muted" aria-live="polite">
            {total} {total === 1 ? "application" : "applications"}
          </p>
          <ul aria-label="Applications" className="m-0 flex list-none flex-col gap-3 p-0">
            {items.map((a) => (
              <li key={a.id}>
                <Link
                  href={`${base}/${a.id}`}
                  className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 text-fg no-underline transition-colors hover:border-border-strong md:flex-row md:items-center md:gap-5 md:p-5"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-[17px] font-medium">{a.applicantName}</span>
                      <span className="font-mono text-[12px] text-muted">{a.reference}</span>
                    </span>
                    <span className="truncate text-[14px] text-muted">
                      {a.school} · {levelLabel(a.level)} · {a.classYear}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-4 md:justify-end">
                    <span className="font-mono text-[14px] text-fg-soft">{formatCad(a.amountRequested)}</span>
                    <span className="font-mono text-[12px] text-faint">
                      {new Intl.DateTimeFormat("en-CA", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(a.createdAt))}
                    </span>
                    <StatusPill status={a.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {filters.page > 1 || more ? (
            <nav aria-label="Pages" className="flex justify-between">
              {filters.page > 1 ? (
                <Link href={hrefFor(base, filters, { page: filters.page - 1 })}>← Newer</Link>
              ) : (
                <span />
              )}
              {more ? <Link href={hrefFor(base, filters, { page: filters.page + 1 })}>Older →</Link> : null}
            </nav>
          ) : null}
        </>
      )}
    </>
  );
}
