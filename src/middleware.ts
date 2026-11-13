import { NextResponse, type NextRequest } from "next/server";

import { loginPathFor, safeNextPath } from "@/lib/auth/redirect";
import { updateSession } from "@/lib/supabase/middleware";

const NOINDEX = "noindex, nofollow";

/** Copy refreshed auth cookies onto a redirect, so a token refresh is never lost. */
function redirectWithCookies(url: URL, from: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url, { status: 307 });
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLogin = pathname === "/login";

  const { response, user } = await updateSession(request);

  if (isAdmin && !user) {
    const target = redirectWithCookies(new URL(loginPathFor(pathname, search), request.url), response);
    target.headers.set("X-Robots-Tag", NOINDEX);
    return target;
  }

  if (isLogin && user) {
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    return redirectWithCookies(new URL(next, request.url), response);
  }

  if (isAdmin || isLogin || pathname.startsWith("/auth/")) {
    response.headers.set("X-Robots-Tag", NOINDEX);
    // Private pages must never sit in a shared cache.
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  // Every route except static assets, so sessions stay fresh on the public site too.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|sw.js|manifest.webmanifest|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
