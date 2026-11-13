import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult = {
  ok: boolean;
  reason?: "missing-token" | "failed" | "not-configured" | "unreachable";
};

/**
 * Cloudflare Turnstile server check (DESIGN.md §8). Without TURNSTILE_SECRET_KEY it passes in development and fails
 * closed in production. Cloudflare's test keys work for local testing (see .env.example).
 */
export async function verifyTurnstile(token: string | null, ip: string): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return process.env.NODE_ENV === "production" ? { ok: false, reason: "not-configured" } : { ok: true };
  }
  if (!token) return { ok: false, reason: "missing-token" };

  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);
  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(8000) });
    const data = (await res.json()) as { success?: boolean };
    return data.success ? { ok: true } : { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}
