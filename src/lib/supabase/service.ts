import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { requireSupabaseEnv } from "./env";

/**
 * SERVICE ROLE — bypasses row-level security. Server-only (the `server-only` import fails any client build),
 * and ESLint blocks importing this file outside src/server, src/app/api, scripts and tests.
 * Use only where no user is signed in: the public foundation form, crons.
 */
export function createServiceClient() {
  const { url } = requireSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
