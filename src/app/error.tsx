"use client";

import { ErrorPanel } from "@/components/shell/error-panel";

/** Errors outside the admin and public layouts (login, styleguide). */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="flex min-h-dvh items-center">
      <ErrorPanel error={error} reset={reset} homeHref="/" homeLabel="Go to the front page" />
    </main>
  );
}
