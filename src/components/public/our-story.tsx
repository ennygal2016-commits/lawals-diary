import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { RichText } from "@/components/entries/rich-text";
import { Button } from "@/components/ui/button";
import { splitNames } from "@/lib/about";
import { isDocEmpty } from "@/lib/rich-text";
import { SITE_TAGLINE } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { StoryData } from "@/server/queries/about";

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));

/**
 * "Our story" (Nocturne "Our story · public site"): rings + names hero, hero photo, the story column, the milestones
 * rail with partner-colour dots, a gallery strip and the lavender foundation panel. Used by / and the admin preview.
 */
export function OurStory({ story, preview = false }: { story: StoryData; preview?: boolean }) {
  const names = splitNames(story.coupleNames);

  return (
    <article className="flex flex-col pb-24">
      <section className="relative mx-auto flex w-full max-w-[1304px] flex-col items-center gap-6 px-5 pt-12 pb-12 text-center md:px-8 md:pt-[72px]">
        <svg
          aria-hidden
          viewBox="0 0 440 280"
          className="pointer-events-none absolute top-6 left-1/2 h-[200px] w-[320px] -translate-x-1/2 md:top-10 md:h-[280px] md:w-[440px]"
        >
          <circle cx="140" cy="140" r="138" fill="none" stroke="var(--accent)" strokeOpacity="0.35" />
          <circle cx="300" cy="140" r="138" fill="none" stroke="var(--lavender)" strokeOpacity="0.35" />
        </svg>
        <span className="eyebrow relative">Our story{story.since ? ` · since ${story.since}` : ""}</span>
        <h1 className="serif relative m-0 text-[clamp(56px,11vw,148px)] leading-[0.92] tracking-[-0.02em]">
          {names ? (
            <>
              {names[0]} <em className="text-accent">&amp;</em> {names[1]}
            </>
          ) : (
            story.coupleNames
          )}
        </h1>
        <p className="serif relative m-0 max-w-[620px] text-[22px] leading-[1.3] text-fg-soft italic md:text-[26px]">
          {SITE_TAGLINE}
        </p>
      </section>

      {story.heroUrl ? (
        <div className="mx-auto w-full max-w-[1214px] px-5 md:px-8">
          {/* eslint-disable-next-line @next/next/no-img-element -- public CDN / signed URL; sizes are fixed variants */}
          <img
            src={story.heroUrl}
            alt=""
            className="aspect-[16/9] w-full rounded-hero border border-border object-cover md:aspect-[2.2/1]"
          />
        </div>
      ) : null}

      {!isDocEmpty(story.story) ? (
        <section
          aria-labelledby="story-heading"
          className="mx-auto mt-16 w-full max-w-[784px] px-5 md:mt-24 md:px-8"
        >
          <h2 id="story-heading" className="eyebrow m-0 mb-5">
            How it began
          </h2>
          <RichText
            doc={story.story}
            className="text-[18px] [&>p:first-child]:serif [&>p:first-child]:text-[30px] [&>p:first-child]:leading-tight [&>p:first-child]:text-fg md:[&>p:first-child]:text-[36px]"
          />
        </section>
      ) : preview ? (
        <p className="mx-auto mt-16 max-w-[720px] px-5 text-center text-[15px] text-muted">
          The story goes here — write it in the editor.
        </p>
      ) : null}

      {story.milestones.length ? (
        <section
          aria-labelledby="milestones-heading"
          className="mx-auto mt-20 w-full max-w-[1214px] px-5 md:mt-28 md:px-8"
        >
          <h2 id="milestones-heading" className="serif m-0 mb-8 text-[40px] leading-none md:text-[48px]">
            Milestones
          </h2>
          <ol className="relative m-0 grid list-none gap-8 p-0 before:absolute before:top-[9px] before:right-0 before:left-0 before:hidden before:h-px before:bg-border-strong sm:grid-cols-2 md:before:block lg:grid-cols-4">
            {story.milestones.map((m, i) => (
              <li key={m.id} className="relative flex flex-col gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "relative size-[18px] rounded-full border-2 bg-bg",
                    i % 2 === 0 ? "border-accent" : "border-lavender",
                  )}
                />
                <span className="mt-2 font-mono text-[13px] text-accent uppercase">{fmtDate(m.date)}</span>
                <h3 className="serif m-0 text-[28px] leading-tight">{m.title}</h3>
                {m.text ? <p className="m-0 text-[15px] leading-relaxed text-muted">{m.text}</p> : null}
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- public CDN / signed URL
                  <img
                    src={m.photoUrl}
                    alt=""
                    loading="lazy"
                    className="mt-2 aspect-[4/3] w-full rounded-tile object-cover"
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {story.gallery.length ? (
        <section
          aria-labelledby="from-gallery-heading"
          className="mx-auto mt-20 w-full max-w-[1214px] px-5 md:mt-28 md:px-8"
        >
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 id="from-gallery-heading" className="serif m-0 text-[40px] leading-none md:text-[48px]">
              From the gallery
            </h2>
            <Link href="/gallery" className="text-[15px] text-accent underline underline-offset-2">
              See all →
            </Link>
          </div>
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-5">
            {story.gallery.slice(0, 10).map((p) => (
              <li key={p.id} className="aspect-square overflow-hidden rounded-tile bg-placeholder-tint">
                {/* eslint-disable-next-line @next/next/no-img-element -- public CDN / signed URL */}
                <img src={p.url} alt={p.caption ?? ""} loading="lazy" className="size-full object-cover" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mx-auto mt-20 w-full max-w-[1214px] px-5 md:mt-28 md:px-8">
        <div className="flex flex-col items-start gap-4 rounded-panel border border-lavender/40 bg-lavender-soft p-7 md:flex-row md:items-center md:justify-between md:p-10">
          <div className="flex items-start gap-4">
            <GraduationCap aria-hidden className="mt-1 size-7 shrink-0 text-lavender" strokeWidth={1.5} />
            <div>
              <h2 className="serif m-0 text-[30px] leading-tight">A foundation in our name</h2>
              <p className="m-0 mt-1 text-[15px] text-lavender-text">
                Help with school fees and study costs.
              </p>
            </div>
          </div>
          <Button asChild variant="inverse">
            <Link href="/foundation">Apply to the foundation</Link>
          </Button>
        </div>
      </section>
    </article>
  );
}
