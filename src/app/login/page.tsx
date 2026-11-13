import type { Metadata } from "next";

import { RingsMark, Wordmark } from "@/components/shell/wordmark";
import { DEFAULT_AFTER_SIGN_IN, safeNextPath } from "@/lib/auth/redirect";
import { AUTH_MESSAGES } from "@/lib/validation/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

type SearchParams = Promise<{
  next?: string | string[];
  error?: string | string[];
  signed_out?: string | string[];
}>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** DESIGN.md §4: 440 px, centred, in the Nocturne style. No sign-up — there are exactly two accounts. */
export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = safeNextPath(first(params.next));
  const notice =
    first(params.error) === "link"
      ? AUTH_MESSAGES.linkInvalid
      : first(params.signed_out)
        ? AUTH_MESSAGES.signedOut
        : undefined;

  return (
    <main
      id="main"
      className="relative mx-auto flex min-h-dvh max-w-[488px] flex-col justify-center px-6 py-16"
    >
      <div className="mb-10">
        <Wordmark href="/" />
      </div>

      <div className="relative overflow-hidden rounded-panel border border-border-strong bg-surface p-7 shadow-glow sm:p-9">
        <RingsMark className="pointer-events-none absolute -top-8 -right-12 h-[120px] w-[186px] opacity-[0.12]" />
        <p className="eyebrow mb-3">Just the two of us</p>
        <h1 className="serif m-0 mb-2 text-[44px] leading-none">Welcome back</h1>
        <p className="mb-7 text-[15px] text-muted">Sign in to the diary.</p>
        <LoginForm next={next === DEFAULT_AFTER_SIGN_IN ? undefined : next} initialNotice={notice} />
      </div>

      <p className="mt-6 text-center text-[13px] text-faint">This diary is private. There’s no sign-up.</p>
    </main>
  );
}
