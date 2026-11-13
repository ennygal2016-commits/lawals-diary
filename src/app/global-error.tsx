"use client";

import "./globals.css";

/** Last resort when the root layout itself fails. Plain markup: the layout's fonts and providers aren't here. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-CA">
      <body>
        <main
          id="main"
          className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center gap-5 px-5 py-16"
        >
          <p className="eyebrow m-0">Something went wrong</p>
          <h1 className="m-0 font-serif text-[44px] leading-[1.05]">Lawal’s diary didn’t load.</h1>
          <p className="m-0 text-fg-soft">Try again in a moment.</p>
          {error.digest ? (
            <p className="m-0 font-mono text-[13px] text-muted">Error code: {error.digest}</p>
          ) : null}
          <div>
            <button
              type="button"
              onClick={reset}
              className="h-12 rounded-btn bg-accent px-6 font-medium text-accent-ink"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
