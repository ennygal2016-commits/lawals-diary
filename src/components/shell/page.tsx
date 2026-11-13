import type * as React from "react";
import { Hammer } from "lucide-react";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * DESIGN.md §4 page widths. Values are CONTENT widths (as in Nocturne); the classes add the
 * 2 × 32px desktop side padding: wide 1150 (Home, Photos) · medium 800 (Foundation) ·
 * narrow 760 (forms, Timeline, Calendar, More pages).
 */
const widths = {
  wide: "max-w-[1214px]",
  medium: "max-w-[864px]",
  narrow: "max-w-[824px]",
} as const;

export type PageWidth = keyof typeof widths;

export function PageContainer({
  width = "narrow",
  className,
  children,
}: {
  width?: PageWidth;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6 px-5 pt-6 md:gap-8 md:px-8 md:pt-14",
        widths[width],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <h1 className="page-title m-0">{title}</h1>
      {meta ? <span className="font-mono text-[13px] text-muted uppercase">{meta}</span> : null}
      {actions}
    </div>
  );
}

/** Phase 1 placeholder for routes that are built in later phases. */
export function PlaceholderPage({
  title,
  phase,
  description,
  width = "narrow",
}: {
  title: string;
  phase: number;
  description: string;
  width?: PageWidth;
}) {
  return (
    <PageContainer width={width}>
      <PageHeader title={title} />
      <p className="m-0 max-w-[60ch] text-[17px] text-muted">{description}</p>
      <EmptyState variant="dashed" icon={Hammer} message={`This page is built in Phase ${phase}.`} />
    </PageContainer>
  );
}
