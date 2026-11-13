"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Paperclip, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { calendarDate } from "@/lib/dates";
import { UPLOAD_BUDGET_BYTES, UPLOAD_BUDGET_LABEL, shrinkImage } from "@/lib/images/shrink";
import { SHARED_TIMEZONE } from "@/lib/site";
import { cn } from "@/lib/utils";
import {
  type ApplicationInput,
  DOCS_MAX,
  DOC_INPUT_ACCEPT,
  DOC_MAX_BYTES,
  REASON_MAX,
  SCHOOL_LEVELS,
  ageOn,
  applicationSchema,
} from "@/lib/validation/foundation";
import type { ApplyResponse } from "@/app/api/foundation/apply/route";
import { Turnstile, type TurnstileHandle } from "./turnstile";

/** The level select starts empty ("Choose a level"); the schema rejects that on submit. */
type FormValues = Omit<ApplicationInput, "level"> & { level: string };

function sizeLabel(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * The public application form (PRD FR-32). Validated in the browser with the same Zod schema the server uses;
 * documents are checked for count and size here and cleaned on the server.
 */
export function ApplicationForm({ submitUrl = "/api/foundation/apply" }: { submitUrl?: string }) {
  const router = useRouter();
  const today = React.useMemo(() => calendarDate(new Date(), SHARED_TIMEZONE), []);
  const schema = React.useMemo(() => applicationSchema(today), [today]);
  const {
    register,
    handleSubmit,
    watch,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: { level: "", consent_data: false, consent_contact: false },
    // Focus is moved by hand (onInvalid) to the first invalid field in page order — RHF's own order follows
    // registration, which is not reliable with render-prop fields.
    shouldFocusError: false,
  });
  const [files, setFiles] = React.useState<File[]>([]);
  const [fileError, setFileError] = React.useState<string>();
  const [banner, setBanner] = React.useState<string>();
  const [token, setToken] = React.useState<string | null>(null);
  const turnstile = React.useRef<TurnstileHandle>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);

  const dob = watch("applicant_dob");
  const isMinor = typeof dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dob) && ageOn(dob, today) < 18;
  const reason = watch("reason") ?? "";

  const [preparing, setPreparing] = React.useState(false);

  /** Photos are resized in the browser; everything together must fit one upload (UPLOAD_BUDGET_LABEL). */
  async function addFiles(list: File[]) {
    setFileError(undefined);
    if (!list.length) return;
    setPreparing(true);
    const next = [...files];
    let total = next.reduce((sum, f) => sum + f.size, 0);
    let error: string | undefined;
    for (const original of list) {
      if (next.length >= DOCS_MAX) {
        error = `Up to ${DOCS_MAX} files.`;
        break;
      }
      if (original.size > DOC_MAX_BYTES) {
        error = `“${original.name}” is over 10 MB.`;
        continue;
      }
      const f = await shrinkImage(original);
      if (total + f.size > UPLOAD_BUDGET_BYTES) {
        error = `“${original.name}” would take the attachments over ${UPLOAD_BUDGET_LABEL} in total.`;
        continue;
      }
      total += f.size;
      next.push(f);
    }
    setFiles(next);
    setFileError(error);
    setPreparing(false);
  }

  const formRef = React.useRef<HTMLFormElement>(null);
  const focusFirstInvalid = () =>
    requestAnimationFrame(() =>
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    );

  const onSubmit = handleSubmit(async (values) => {
    setBanner(undefined);
    const body = new FormData();
    for (const [k, v] of Object.entries(values)) {
      if (v === undefined || v === null) continue;
      body.set(k, typeof v === "boolean" ? (v ? "on" : "") : String(v));
    }
    for (const f of files) body.append("documents", f);
    if (token) body.set("cf-turnstile-response", token);

    let result: ApplyResponse;
    try {
      const res = await fetch(submitUrl, { method: "POST", body });
      result = (await res.json()) as ApplyResponse;
    } catch {
      result = { ok: false, error: "That didn’t send. Check your connection and try again." };
    }
    if (result.ok) {
      router.push(`/foundation/thanks?ref=${encodeURIComponent(result.reference)}`);
      return;
    }
    turnstile.current?.reset();
    setBanner(result.error);
    let first: string | undefined;
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if (field === "documents") setFileError(message);
      else {
        setError(field as keyof FormValues, { message });
        first ??= field;
      }
    }
    if (first) setFocus(first as keyof FormValues);
    focusFirstInvalid();
  }, focusFirstInvalid);

  const err = (k: keyof FormValues) => errors[k]?.message as string | undefined;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-10"
      aria-describedby="apply-privacy"
    >
      <div aria-live="assertive">
        {banner ? (
          <p
            role="alert"
            className="m-0 rounded-tile border border-danger bg-danger-soft px-4 py-3 text-[15px] text-fg"
          >
            {banner}
          </p>
        ) : null}
      </div>

      <Fieldset legend="About the applicant">
        <Field label="Full name" required error={err("applicant_name")}>
          {(c) => <Input {...c} autoComplete="name" maxLength={120} {...register("applicant_name")} />}
        </Field>
        <Field label="Date of birth" required error={err("applicant_dob")}>
          {(c) => <Input {...c} type="date" max={today} {...register("applicant_dob")} />}
        </Field>
        <Field label="Phone" error={err("applicant_phone")}>
          {(c) => <Input {...c} type="tel" autoComplete="tel" {...register("applicant_phone")} />}
        </Field>
        <Field
          label="Email"
          hint="We send your reference number here. Give this or a guardian’s email."
          error={err("applicant_email")}
        >
          {(c) => <Input {...c} type="email" autoComplete="email" {...register("applicant_email")} />}
        </Field>
      </Fieldset>

      <Fieldset
        legend="Parent or guardian"
        description={
          isMinor ? "Required — the applicant is under 18." : "Required if the applicant is under 18."
        }
      >
        <Field label="Full name" required={isMinor} error={err("guardian_name")}>
          {(c) => <Input {...c} maxLength={120} {...register("guardian_name")} />}
        </Field>
        <Field
          label="Relationship"
          hint="For example: mother, uncle, legal guardian"
          error={err("guardian_relationship")}
        >
          {(c) => <Input {...c} maxLength={60} {...register("guardian_relationship")} />}
        </Field>
        <Field label="Phone" error={err("guardian_phone")}>
          {(c) => <Input {...c} type="tel" {...register("guardian_phone")} />}
        </Field>
        <Field label="Email" error={err("guardian_email")}>
          {(c) => <Input {...c} type="email" {...register("guardian_email")} />}
        </Field>
      </Fieldset>

      <Fieldset legend="School">
        <Field label="School name" required error={err("school")} className="md:col-span-2">
          {(c) => <Input {...c} maxLength={200} {...register("school")} />}
        </Field>
        <Field label="Level" required error={err("level")}>
          {(c) => (
            <select
              {...c}
              {...register("level")}
              className="h-12 w-full rounded-input border border-border bg-raised px-3 text-[15px] text-fg aria-[invalid=true]:border-danger"
            >
              <option value="" disabled>
                Choose a level
              </option>
              {SCHOOL_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          label="Class or year"
          required
          hint="For example: JSS2, Primary 5, Year 2"
          error={err("class_year")}
        >
          {(c) => <Input {...c} maxLength={60} {...register("class_year")} />}
        </Field>
      </Fieldset>

      <Fieldset legend="Your request">
        <Field
          label="Amount requested (CAD)"
          required
          hint="In Canadian dollars."
          error={err("amount_requested")}
        >
          {(c) => (
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
              >
                CA$
              </span>
              <Input
                {...c}
                inputMode="decimal"
                className="pl-12"
                placeholder="0.00"
                {...register("amount_requested")}
              />
            </div>
          )}
        </Field>
        <Field
          label="Why are you applying?"
          required
          hint="What the money is for, and anything we should know about your situation."
          error={err("reason")}
          className="md:col-span-2"
        >
          {(c) => (
            <Textarea
              {...c}
              rows={7}
              maxLength={REASON_MAX}
              showCount
              value={reason}
              {...register("reason")}
            />
          )}
        </Field>
      </Fieldset>

      <Fieldset
        legend="Supporting documents"
        description={`Optional. Up to ${DOCS_MAX} files, ${UPLOAD_BUDGET_LABEL} in total: PDFs or photos (photos are resized for you).`}
      >
        <div className="flex flex-col gap-3 md:col-span-2">
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={DOC_INPUT_ACCEPT}
            className="visually-hidden"
            tabIndex={-1}
            aria-label="Choose files to attach"
            data-testid="documents-file"
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              e.target.value = "";
              void addFiles(list);
            }}
          />
          {files.length ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Documents to send">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-3 rounded-tile border border-border bg-raised px-3 py-2"
                >
                  <FileText aria-hidden className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 truncate text-[14px]">{f.name}</span>
                  <span className="font-mono text-[12px] text-muted">{sizeLabel(f.size)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-overlay hover:text-fg"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => fileInput.current?.click()}
              disabled={files.length >= DOCS_MAX || preparing}
            >
              <Paperclip aria-hidden strokeWidth={1.75} />
              Add documents
            </Button>
            <span className="text-[13px] text-muted">
              {files.length} / {DOCS_MAX} · Location data is removed from photos.
            </span>
          </div>
          {fileError ? (
            <p role="alert" className="m-0 text-[13px] text-danger">
              {fileError}
            </p>
          ) : null}
        </div>
      </Fieldset>

      <Fieldset legend="Consent">
        <div className="flex flex-col gap-4 md:col-span-2">
          <Checkbox
            label="I agree that the information in this application may be used to assess it."
            error={err("consent_data")}
            {...register("consent_data")}
          />
          <Checkbox
            label="You may contact me, or my parent or guardian, about this application."
            error={err("consent_contact")}
            {...register("consent_contact")}
          />
        </div>
      </Fieldset>

      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>

      <div className="flex flex-col gap-4">
        <Turnstile ref={turnstile} onToken={setToken} />
        <p id="apply-privacy" className="m-0 text-[13px] leading-relaxed text-muted">
          Only the two foundation trustees can see your application and documents. We use them only to
          consider this request.
        </p>
        <div>
          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full md:w-auto">
            {isSubmitting ? "Sending…" : "Submit application"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Fieldset({
  legend,
  description,
  children,
}: {
  legend: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="m-0 grid gap-5 border-0 border-t border-divider p-0 pt-6 md:grid-cols-2">
      <legend className="serif float-left mb-1 w-full p-0 text-[26px] leading-tight md:col-span-2">
        {legend}
      </legend>
      {description ? <p className="m-0 -mt-3 text-[14px] text-muted md:col-span-2">{description}</p> : null}
      {children}
    </fieldset>
  );
}

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { label: string; error?: string }
>(function Checkbox({ label, error, className, ...props }, ref) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={cn("flex cursor-pointer items-start gap-3 text-[15px] text-fg-soft", className)}
      >
        <input
          ref={ref}
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-5 shrink-0 accent-[var(--lavender)]"
          {...props}
        />
        <span>
          {label}
          <span aria-hidden className="text-accent">
            {" "}
            *
          </span>
        </span>
      </label>
      {error ? (
        <p id={`${id}-error`} role="alert" className="m-0 ml-8 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});
