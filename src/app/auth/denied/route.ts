import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** Signed in, but not one of the two partners: end the session and show the neutral sign-in page. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/login?error=link", request.url), { status: 303 });
}
