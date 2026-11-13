import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type LimitResult = { success: boolean; resetAt: number };

/**
 * Foundation form rate limit (DESIGN.md §8): 5 submissions per IP per hour.
 * Upstash Redis when configured (shared across serverless instances); otherwise an in-memory sliding window, which
 * is fine for local development but per-instance in production — set UPSTASH_* before launch.
 */
const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

let upstash: Ratelimit | null | undefined;
function upstashLimiter(): Ratelimit | null {
  if (upstash !== undefined) return upstash;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  upstash =
    url && token
      ? new Ratelimit({
          redis: new Redis({ url, token }),
          limiter: Ratelimit.slidingWindow(LIMIT, "1 h"),
          prefix: "lawals-diary:foundation-apply",
        })
      : null;
  return upstash;
}

const memory = new Map<string, number[]>();

export function memoryLimit(key: string, now = Date.now(), limit = LIMIT, windowMs = WINDOW_MS): LimitResult {
  const recent = (memory.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    memory.set(key, recent);
    return { success: false, resetAt: recent[0]! + windowMs };
  }
  recent.push(now);
  memory.set(key, recent);
  return { success: true, resetAt: now + windowMs };
}

export async function limitFoundationApplication(ip: string): Promise<LimitResult> {
  const limiter = upstashLimiter();
  if (!limiter) return memoryLimit(`apply:${ip}`);
  try {
    const r = await limiter.limit(ip);
    return { success: r.success, resetAt: r.reset };
  } catch {
    // Redis down: fall back rather than letting everything through.
    return memoryLimit(`apply:${ip}`);
  }
}

/** Client IP as Vercel/most proxies pass it. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
