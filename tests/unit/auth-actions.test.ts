import { afterEach, describe, expect, it, vi } from "vitest";

import { sendMagicLink, signInWithPassword } from "@/server/actions/auth";
import { AUTH_MESSAGES } from "@/lib/validation/auth";

// Before the app is connected to Supabase, signing in must answer politely instead of crashing the page.
describe("sign-in without Supabase configured", () => {
  afterEach(() => vi.unstubAllEnvs());

  const form = (fields: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) f.set(k, v);
    return f;
  };

  it("password sign-in returns 'unavailable'", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const r = await signInWithPassword(
      { status: "idle" },
      form({ email: "someone@example.com", password: "long-enough-password" }),
    );
    expect(r).toEqual({ status: "error", message: AUTH_MESSAGES.unavailable, email: "someone@example.com" });
  });

  it("magic link returns 'unavailable'", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const r = await sendMagicLink({ status: "idle" }, form({ email: "someone@example.com" }));
    expect(r).toMatchObject({ status: "error", message: AUTH_MESSAGES.unavailable });
  });
});
