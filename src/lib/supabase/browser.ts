"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { SESSION_COOKIE_OPTIONS, requireSupabaseEnv } from "./env";

/** Supabase client for Client Components. Uses only the public anon key; RLS applies. */
export function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey, { cookieOptions: SESSION_COOKIE_OPTIONS });
}

/**
 * A client whose Realtime connection carries the signed-in user's token. Without this, a channel opened right
 * after page load subscribes before the session has been read from the cookie — as an anonymous visitor, whom the
 * database (correctly) refuses, so live updates silently never arrived.
 */
export async function createRealtimeClient() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (data.session) await supabase.realtime.setAuth(data.session.access_token);
  return supabase;
}
