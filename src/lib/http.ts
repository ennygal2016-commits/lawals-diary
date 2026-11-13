/**
 * CSRF guard for POST routes: a browser sends `Origin` on cross-site POSTs, so a request is same-site when its Origin's
 * host matches the Host the request was sent to (X-Forwarded-Host behind a proxy such as Vercel). Comparing against
 * Next's `nextUrl.origin` is wrong — Next normalises the hostname (127.0.0.1 → localhost).
 * No Origin header (same-origin GET-style tools, older clients) is allowed; SameSite=Lax cookies cover that case.
 */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (!origin) return true;
  if (origin === "null") return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  const host = (headers.get("x-forwarded-host") ?? headers.get("host") ?? "")
    .split(",")[0]!
    .trim()
    .toLowerCase();
  return host !== "" && originHost === host;
}
