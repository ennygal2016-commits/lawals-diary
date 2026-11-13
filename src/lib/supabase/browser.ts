"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { SESSION_COOKIE_OPTIONS, requireSupabaseEnv } from "./env";

/** Supabase client for Client Components. Uses only the public anon key; RLS applies. */
export function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey, { cookieOptions: SESSION_COOKIE_OPTIONS });
}
