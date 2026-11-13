"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Shown by the error boundaries. Never shows the error message itself (it could contain private data or
 * internals) — only Next's opaque digest, so a problem can be matched to the server log.
 */
export function ErrorPanel({
  error,
  reset,
  homeHref,
  homeLabel,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref: string;
  homeLabel: string;
}) {
  const heading = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    heading.current?.focus();
    console.error(error);
  }, [error]);
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5 px-5 py-16 md:py-24">
      <p className="eyebrow m-0">{offline ? "Offline" : "Something went wrong"}</p>
      <h1
        ref={heading}
        tabIndex={-1}
        className="serif m-0 text-[40px] leading-[1.05] outline-none md:text-[52px]"
      >
        {offline ? "You’re offline." : "This page didn’t load."}
      </h1>
      <p className="m-0 text-fg-soft">
        {offline
          ? "Check your connection, then try again. Nothing you saved is lost."
          : "It’s not you — try again in a moment. If it keeps happening, the code below helps track it down."}
      </p>
      {error.digest && !offline ? (
        <p className="m-0 font-mono text-[13px] text-muted">Error code: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>
          <RotateCcw aria-hidden strokeWidth={1.75} />
          Try again
        </Button>
        <Button asChild variant="secondary">
          <Link href={homeHref}>{homeLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
