"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The four smaller daily cards (PRD FR-7). Desktop/tablet: a 2 × 2 grid. Phone: a horizontal swipe row of
 * 250 px cards with page dots (DESIGN.md §3 Daily card). Same DOM in both — only CSS changes.
 */
export function DailyRow({ children, labels }: { children: React.ReactNode[]; labels: string[] }) {
  const scroller = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(0);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 12 : el.clientWidth;
    setActive(Math.min(children.length - 1, Math.round(el.scrollLeft / step)));
  }

  function goTo(index: number) {
    const el = scroller.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft - pad, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={scroller}
        onScroll={onScroll}
        // Phone: the swipe row scrolls sideways, so it must be reachable by keyboard (arrow keys scroll it).
        tabIndex={0}
        role="region"
        aria-label="Daily words"
        className={cn(
          // Phone: swipe row that bleeds to the screen edge. scroll-px-5 matches the padding, so the first card's
          // snap position is 0: without it the browser snapped 20 px on load, which Chrome treats as a scroll and
          // stops measuring Largest Contentful Paint (Lighthouse mobile performance fell to ~60).
          "-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto scroll-smooth px-5 pb-1 [scrollbar-width:none]",
          "[&>*]:w-[250px] [&>*]:shrink-0 [&>*]:snap-start",
          // ≥ 768: 2 × 2 grid.
          "md:mx-0 md:grid md:scroll-px-0 md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 md:[&>*]:w-auto",
        )}
      >
        {children}
      </div>
      <div className="flex justify-center md:hidden" role="group" aria-label="Daily cards">
        {labels.map((label, i) => (
          <button
            key={label}
            type="button"
            aria-label={`Show ${label}`}
            aria-current={i === active ? "true" : undefined}
            onClick={() => goTo(i)}
            className="flex size-6 items-center justify-center"
          >
            <span
              aria-hidden
              className={cn(
                "block h-1 rounded-full transition-all",
                i === active ? "w-4 bg-fg" : "w-1 bg-border-dashed",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
