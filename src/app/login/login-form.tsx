"use client";

import * as React from "react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { type AuthFormState, sendMagicLink, signInWithPassword } from "@/server/actions/auth";

const IDLE: AuthFormState = { status: "idle" };

/**
 * One email field, two ways in (PRD FR-1): "Sign in" posts email + password; "Email me a magic link" posts the
 * same form to a second action and skips password validation. Works without JavaScript.
 */
export function LoginForm({ next, initialNotice }: { next?: string; initialNotice?: string }) {
  const [passwordState, passwordAction, passwordPending] = React.useActionState(signInWithPassword, IDLE);
  const [linkState, linkAction, linkPending] = React.useActionState(sendMagicLink, IDLE);
  const [last, setLast] = React.useState<"password" | "link" | null>(null);

  const state = last === "link" ? linkState : last === "password" ? passwordState : IDLE;
  const pending = passwordPending || linkPending;
  const emailError = state.fieldErrors?.email;
  const passwordError = last === "password" ? state.fieldErrors?.password : undefined;
  const banner = state.message ?? (last ? undefined : initialNotice);
  const bannerTone = state.status === "error" ? "error" : "info";

  return (
    <form
      action={passwordAction}
      noValidate
      className="flex flex-col gap-5"
      aria-describedby={banner ? "login-status" : undefined}
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div id="login-status" aria-live="polite" className="empty:hidden">
        {banner ? (
          <p
            role={bannerTone === "error" ? "alert" : "status"}
            className={
              bannerTone === "error"
                ? "rounded-tile border border-danger bg-danger-soft px-4 py-3 text-[14px] leading-relaxed text-fg"
                : "rounded-tile border border-border-accent bg-accent-soft px-4 py-3 text-[14px] leading-relaxed text-fg"
            }
          >
            {banner}
          </p>
        ) : null}
      </div>

      <Field label="Email" error={emailError}>
        {(control) => (
          <Input
            {...control}
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={state.email}
            key={state.email ?? "email"}
            required
          />
        )}
      </Field>

      <Field label="Password" error={passwordError}>
        {(control) => <Input {...control} name="password" type="password" autoComplete="current-password" />}
      </Field>

      <div className="flex flex-col gap-3">
        <Button type="submit" size="block" disabled={pending} onClick={() => setLast("password")}>
          {passwordPending ? "Signing in…" : "Sign in"}
        </Button>

        <div className="flex items-center gap-3 text-[13px] text-faint" aria-hidden>
          <span className="h-px flex-1 bg-divider" />
          or
          <span className="h-px flex-1 bg-divider" />
        </div>

        <Button
          type="submit"
          variant="secondary"
          size="block"
          formAction={linkAction}
          formNoValidate
          disabled={pending}
          onClick={() => setLast("link")}
        >
          <Mail aria-hidden strokeWidth={1.75} />
          {linkPending ? "Sending…" : "Email me a magic link"}
        </Button>
      </div>
    </form>
  );
}
