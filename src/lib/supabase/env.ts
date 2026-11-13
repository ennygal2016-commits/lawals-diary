/** Public Supabase settings. Both are safe in the browser (the anon key is limited by RLS). */
export function supabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function requireSupabaseEnv(): { url: string; anonKey: string } {
  const env = supabaseEnv();
  if (!env) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set (see .env.example).",
    );
  }
  return env;
}

/**
 * Auth cookie options shared by every client. PRD FR-2: a session lasts 30 days on a trusted device —
 * the cookie is re-set (sliding) whenever the middleware refreshes the session.
 */
export const SESSION_COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 30,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;
