import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/http";

/**
 * POST /auth/signout — ends the session on this device only (PRD FR-2). POST only, so a link or prefetch can
 * never sign anyone out; cross-site posts are refused (CSRF).
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  return NextResponse.redirect(new URL("/login?signed_out=1", request.url), { status: 303 });
}
