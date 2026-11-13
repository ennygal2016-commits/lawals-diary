import type * as React from "react";

import { PageContainer } from "@/components/shell/page";
import { cn } from "@/lib/utils";

/** A grey placeholder block. Pulses only when the user hasn't asked for reduced motion. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-[10px] bg-raised motion-safe:animate-pulse", className)} />;
}

/** Wraps a loading layout: one polite status for screen readers, the blocks are hidden from them. */
export function LoadingRegion({
  label = "Loading…",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">{label}</span>
      {children}
    </div>
  );
}

/** Generic admin page: title, a line of meta, then cards. */
export function PageSkeleton({
  width = "wide",
  variant = "cards",
  label,
}: {
  width?: "wide" | "medium" | "narrow";
  variant?: "cards" | "list" | "grid" | "article";
  label?: string;
}) {
  return (
    <LoadingRegion label={label}>
      <PageContainer width={width}>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-56 md:h-16 md:w-80" />
          <Skeleton className="h-4 w-40" />
        </div>
        {variant === "cards" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-56 rounded-card" />
            ))}
          </div>
        ) : variant === "grid" ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
            {Array.from({ length: 15 }, (_, i) => (
              <Skeleton key={i} className="aspect-square rounded-tile" />
            ))}
          </div>
        ) : variant === "list" ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-full rounded-input" />
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-card" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Skeleton className="aspect-[16/9] w-full rounded-card" />
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className={cn("h-4", i === 4 ? "w-2/3" : "w-full")} />
            ))}
          </div>
        )}
      </PageContainer>
    </LoadingRegion>
  );
}
