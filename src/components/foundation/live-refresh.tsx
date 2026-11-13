"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a server-rendered admin page live: any insert/update on the table (Supabase Realtime, RLS applies) triggers
 * a router refresh, so counts and lists update without a reload. Debounced; also refreshes on window focus.
 */
export function LiveRefresh({ table }: { table: "foundation_applications" | "application_events" }) {
  const router = useRouter();

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };
    window.addEventListener("focus", refresh);

    let cleanup = () => {};
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      void import("@/lib/supabase/browser").then(async ({ createRealtimeClient }) => {
        const supabase = await createRealtimeClient();
        const channel = supabase
          .channel(`live:${table}`)
          .on("postgres_changes", { event: "*", schema: "public", table }, refresh)
          .subscribe();
        cleanup = () => void supabase.removeChannel(channel);
      });
    }
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      cleanup();
    };
  }, [router, table]);

  return null;
}
