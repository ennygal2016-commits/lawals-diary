"use client";

import { ErrorPanel } from "@/components/shell/error-panel";

/** Errors inside an admin page: the top bar and tab bar stay, so the rest of the diary is one tap away. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorPanel error={error} reset={reset} homeHref="/admin" homeLabel="Go to Home" />;
}
