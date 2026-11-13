import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { supabaseEnv } from "./env";

/**
 * The PUBLIC site's client: anon key, no cookies, no session — it sees exactly what a visitor sees (the public_*
 * views). Using it even when an admin is browsing keeps public pages cacheable and honest. null if not configured.
 */
export function createPublicClient() {
  const env = supabaseEnv();
  if (!env) return null;
  return createClient<Database>(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 60 } } as RequestInit) },
  });
}

/** CDN URL of a file in the photos-public bucket. */
export function publicPhotoUrl(path: string | undefined): string | null {
  const env = supabaseEnv();
  if (!env || !path) return null;
  return `${env.url}/storage/v1/object/public/photos-public/${path.split("/").map(encodeURIComponent).join("/")}`;
}
