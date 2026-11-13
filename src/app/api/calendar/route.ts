import { NextResponse, type NextRequest } from "next/server";

import { isIsoMonth } from "@/lib/calendar";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getCalendarMonth } from "@/server/queries/calendar";

/**
 * GET /api/calendar?month=YYYY-MM (DESIGN.md §9) — days with entries (for the dots) and the anniversary / special
 * dates (for the hearts). Signed-in partners only; private, never cached by shared caches.
 */
export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month");
  if (!isIsoMonth(month)) {
    return NextResponse.json({ error: "Use ?month=YYYY-MM." }, { status: 400 });
  }

  // Not configured (no Supabase env) → nobody can be signed in.
  if (!supabaseEnv()) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const data = await getCalendarMonth(month);
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
