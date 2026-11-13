import type * as React from "react";
import { BookOpen, Feather, Heart, Sparkles, type LucideProps } from "lucide-react";

import { cn } from "@/lib/utils";
import { cardVariants } from "@/components/ui/card";

/** A plain Latin cross in Lucide's style (Lucide's "Cross" is a medical plus). */
function LatinCross(props: LucideProps) {
  const { size = 24, strokeWidth = 2, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M12 2v20M7 7h10" />
    </svg>
  );
}

export type DailyKind = "scripture" | "romance" | "love" | "faith" | "encouragement";

const KIND_META: Record<DailyKind, { eyebrow: string; icon: React.ComponentType<LucideProps> }> = {
  scripture: { eyebrow: "Scripture for today", icon: BookOpen },
  romance: { eyebrow: "Romance for today", icon: Heart },
  love: { eyebrow: "Love for today", icon: Feather },
  faith: { eyebrow: "Faith for today", icon: LatinCross },
  encouragement: { eyebrow: "Encouragement for today", icon: Sparkles },
};

type DailyCardProps = {
  kind: DailyKind;
  text: string;
  /** "William Shakespeare, Sonnet 116", "Song of Solomon 8:7 · KJV", "A small prompt" */
  attribution?: string;
  /** Quotes get curly quotation marks; prompts don't. */
  isQuote?: boolean;
  /** Scripture only: the translation's licence line, e.g. "King James Version — public domain." */
  notice?: string;
  className?: string;
};

/**
 * DESIGN.md §3 Daily card — eyebrow row with an accent Lucide icon, italic serif text,
 * attribution in accent. The scripture card is the featured full-width variant.
 */
export function DailyCard({ kind, text, attribution, isQuote = true, notice, className }: DailyCardProps) {
  const { eyebrow, icon: Icon } = KIND_META[kind];
  const headingId = `daily-${kind}`;
  const featured = kind === "scripture";

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        cardVariants({ variant: featured ? "featured" : "default", padding: featured ? "lg" : "md" }),
        "flex flex-col",
        featured ? "gap-3 md:gap-5" : "gap-2 md:gap-3.5",
        className,
      )}
    >
      {featured ? (
        <svg
          aria-hidden
          viewBox="0 0 420 420"
          className="pointer-events-none absolute -top-[150px] -right-[120px] hidden size-[420px] opacity-50 md:block"
        >
          {[200, 150, 100].map((r) => (
            <circle key={r} cx="210" cy="210" r={r} fill="none" stroke="var(--border-strong)" />
          ))}
        </svg>
      ) : null}

      <div className="relative flex items-center gap-2.5">
        <Icon aria-hidden className="size-4 text-accent md:size-[18px]" strokeWidth={1.75} />
        <h2 id={headingId} className={cn("eyebrow", featured && "max-md:text-accent")}>
          {eyebrow}
        </h2>
      </div>

      <figure className="relative m-0 flex flex-col gap-3 md:gap-5">
        <blockquote
          className={cn(
            "serif m-0 whitespace-pre-line italic",
            featured
              ? "max-w-[860px] text-[26px] leading-[1.18] md:text-[clamp(28px,3.4vw,42px)]"
              : "text-[20px] leading-[1.22] md:text-[25px] md:leading-[1.25]",
          )}
        >
          {isQuote ? `“${text}”` : text}
        </blockquote>
        {attribution || notice ? (
          <figcaption
            className={cn(
              "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1",
              !featured && "block",
            )}
          >
            {attribution ? (
              <span
                className={cn(
                  "text-accent",
                  featured ? "font-mono text-[12px] md:text-sm" : "text-[12px] md:text-sm",
                )}
              >
                {attribution}
              </span>
            ) : null}
            {notice ? <span className="text-[12px] text-faint md:text-[13px]">{notice}</span> : null}
          </figcaption>
        ) : null}
      </figure>
    </section>
  );
}
