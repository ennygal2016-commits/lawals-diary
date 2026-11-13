/** Where to send someone after signing in. Only same-site /admin paths are allowed (no open redirects). */
export const DEFAULT_AFTER_SIGN_IN = "/admin";

export function safeNextPath(next: string | null | undefined): string {
  if (!next) return DEFAULT_AFTER_SIGN_IN;
  // Reject protocol-relative ("//evil"), backslash tricks ("/\evil") and anything with control characters.
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f]/.test(next)) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  let parsed: URL;
  try {
    parsed = new URL(next, "http://diary.local");
  } catch {
    return DEFAULT_AFTER_SIGN_IN;
  }
  if (parsed.origin !== "http://diary.local") return DEFAULT_AFTER_SIGN_IN;
  if (parsed.pathname !== "/admin" && !parsed.pathname.startsWith("/admin/")) return DEFAULT_AFTER_SIGN_IN;
  return parsed.pathname + parsed.search + parsed.hash;
}

/** /login?next=<path> for a signed-out visitor to `pathname + search`. */
export function loginPathFor(pathname: string, search = ""): string {
  const next = safeNextPath(pathname + search);
  return next === DEFAULT_AFTER_SIGN_IN ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}
