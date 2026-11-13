import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { SESSION_COOKIE_OPTIONS, supabaseEnv } from "./env";

/**
 * Refreshes the Supabase session cookie on every matched request (per @supabase/ssr docs) and reports
 * who is signed in. Returns user null when Supabase isn't configured, so protected routes fail closed.
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request });
  const env = supabaseEnv();
  if (!env) return { response, user: null };

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser() (not getSession()) revalidates the token with Supabase Auth. Do not put code between
  // createServerClient and this call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
