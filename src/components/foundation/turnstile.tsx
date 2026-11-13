"use client";

import * as React from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __onTurnstileLoad?: () => void;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__onTurnstileLoad";
let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    window.__onTurnstileLoad = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("no turnstile"));
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("turnstile script failed"));
    document.head.appendChild(s);
  });
  return loading;
}

export type TurnstileHandle = { reset: () => void };

/**
 * Cloudflare Turnstile, hand-rolled (no extra dependency). Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is
 * unset — the server then only accepts submissions outside production.
 */
export const Turnstile = React.forwardRef<TurnstileHandle, { onToken: (token: string | null) => void }>(
  function Turnstile({ onToken }, ref) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const box = React.useRef<HTMLDivElement>(null);
    const widget = React.useRef<string | null>(null);
    const onTokenRef = React.useRef(onToken);
    const [failed, setFailed] = React.useState(false);
    React.useEffect(() => {
      onTokenRef.current = onToken;
    });

    React.useImperativeHandle(ref, () => ({
      reset: () => {
        if (widget.current) window.turnstile?.reset(widget.current);
        onTokenRef.current(null);
      },
    }));

    React.useEffect(() => {
      if (!siteKey || !box.current) return;
      let cancelled = false;
      loadTurnstile()
        .then((ts) => {
          if (cancelled || !box.current || widget.current) return;
          widget.current = ts.render(box.current, {
            sitekey: siteKey,
            theme: "dark",
            action: "foundation-apply",
            callback: (t: string) => onTokenRef.current(t),
            "expired-callback": () => onTokenRef.current(null),
            "error-callback": () => onTokenRef.current(null),
          });
        })
        .catch(() => setFailed(true));
      return () => {
        cancelled = true;
        if (widget.current) window.turnstile?.remove(widget.current);
        widget.current = null;
      };
    }, [siteKey]);

    if (!siteKey) return null;
    return (
      <div className="flex flex-col gap-2">
        <div ref={box} className="min-h-[65px]" />
        {failed ? (
          <p role="alert" className="m-0 text-[13px] text-danger">
            The security check couldn’t load. Check your connection, then reload the page.
          </p>
        ) : null}
      </div>
    );
  },
);
