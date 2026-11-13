import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }));

export const passwordSignInSchema = z.object({
  email: emailSchema,
  // Trimmed: a space picked up when copying a password must not lock anyone out (seeded passwords are trimmed too).
  password: z.string().trim().min(1, { error: "Enter your password." }).max(200),
  next: z.string().max(2000).optional(),
});

export const magicLinkSchema = z.object({
  email: emailSchema,
  next: z.string().max(2000).optional(),
});

/** Neutral messages: never reveal whether an email belongs to the diary (PRD FR-1). */
export const AUTH_MESSAGES = {
  badCredentials:
    "That email and password didn’t work. Check them and try again, or email yourself a magic link.",
  magicLinkSent:
    "If that email belongs to this diary, a sign-in link is on its way. It works once and expires in an hour.",
  linkInvalid: "That sign-in link has expired or was already used. Ask for a new one below.",
  signedOut: "You’re signed out.",
  unavailable: "Sign-in isn’t available right now. Try again in a few minutes.",
} as const;
