import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { SESSION_COOKIE_OPTIONS, requireSupabaseEnv } from "./env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Acts as the signed-in user, so row-level security applies to every query.
 */
export async function createClient() {
  // cookies() first: it marks the route as dynamic, so nothing behind auth is ever prerendered at build time.
  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The middleware refreshes the
          // session on every request, so this is safe to ignore.
        }
      },
    },
  });
}
