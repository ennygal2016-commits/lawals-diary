"use client";

import * as React from "react";

/** Registers /sw.js in production (offline page for the shell; see public/sw.js for what it caches). */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* not fatal: the site works without it */
    });
  }, []);
  return null;
}

/** A banner in the admin shell while the device is offline, so nobody types into a form that can't save. */
export function OfflineBanner() {
  const [offline, setOffline] = React.useState(false);
  React.useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <div role="status" aria-live="polite">
      {offline ? (
        <p className="fixed inset-x-0 top-0 z-[60] m-0 bg-warning px-4 py-2 text-center text-[14px] font-medium text-[#1a1408]">
          You’re offline — changes won’t save until you’re back online.
        </p>
      ) : null}
    </div>
  );
}
