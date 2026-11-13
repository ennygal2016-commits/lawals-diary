"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/auth/redirect";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { AUTH_MESSAGES, magicLinkSchema, passwordSignInSchema } from "@/lib/validation/auth";

export type AuthFormState = {
  status: "idle" | "error" | "sent";
  message?: string;
  /** Field errors from validation (shape only — never reveals whether an account exists). */
  fieldErrors?: { email?: string; password?: string };
  email?: string;
};

function fieldErrorsOf(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>) {
  const out: NonNullable<AuthFormState["fieldErrors"]> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if ((key === "email" || key === "password") && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function signInWithPassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = passwordSignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsOf(parsed.error.issues), email };
  }

  // Not connected to Supabase yet (keys missing): a polite message, never a crash.
  if (!supabaseEnv()) return { status: "error", message: AUTH_MESSAGES.unavailable, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    // Same message for unknown email, wrong password and unconfirmed account.
    const message =
      error.status && error.status >= 500 ? AUTH_MESSAGES.unavailable : AUTH_MESSAGES.badCredentials;
    return { status: "error", message, email };
  }

  redirect(safeNextPath(parsed.data.next));
}

async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function sendMagicLink(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = magicLinkSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
  });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsOf(parsed.error.issues), email };
  }

  const next = safeNextPath(parsed.data.next);
  const callback = new URL("/auth/callback", await siteOrigin());
  callback.searchParams.set("next", next);

  if (!supabaseEnv()) return { status: "error", message: AUTH_MESSAGES.unavailable, email };

  const supabase = await createClient();
  // shouldCreateUser: false — magic links never create accounts. The allowlist trigger is the second lock.
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: callback.toString() },
  });
  if (error && error.status && error.status >= 500) {
    return { status: "error", message: AUTH_MESSAGES.unavailable, email };
  }
  // Unknown emails get exactly the same answer as known ones.
  return { status: "sent", message: AUTH_MESSAGES.magicLinkSent, email };
}
