import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: ReadonlySet<string> = new Set([
  "magiclink",
  "email",
  "recovery",
  "invite",
  "signup",
  "email_change",
]);

/**
 * Magic-link landing. Supports both link styles:
 *  - ?token_hash=…&type=magiclink  (recommended email template — works on any device)
 *  - ?code=…                        (PKCE default — works in the browser that asked for the link)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type && OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(new URL("/login?error=link", request.url), { status: 303 });
  }
  return NextResponse.redirect(new URL(next, request.url), { status: 303 });
}
