import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { REFERENCE_RE } from "@/lib/validation/foundation";

export const metadata: Metadata = { title: "Application received", robots: { index: false, follow: false } };

/** After submitting (PRD FR-33): the reference number, and what happens next. */
export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const raw = (await searchParams).ref;
  const ref = typeof raw === "string" && REFERENCE_RE.test(raw) ? raw : null;

  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center gap-6 px-5 pt-16 pb-24 text-center md:pt-24">
      <CheckCircle2 aria-hidden className="size-12 text-success" strokeWidth={1.5} />
      <h1 className="page-title m-0">Thank you</h1>
      <p className="m-0 text-[18px] leading-relaxed text-fg-soft">We received your application.</p>
      {ref ? (
        <div className="flex flex-col items-center gap-2 rounded-panel border border-border-strong bg-surface px-8 py-6">
          <span className="eyebrow">Your reference number</span>
          <span className="font-mono text-[28px] tracking-wide text-lavender" data-testid="reference">
            {ref}
          </span>
        </div>
      ) : null}
      <p className="m-0 max-w-[480px] text-[15px] leading-relaxed text-muted">
        Please keep the reference number. A confirmation has been emailed to the address you gave. We read
        every application ourselves and will be in touch using the contact details on your application.
      </p>
      <Button asChild variant="secondary">
        <Link href="/">Back to our story</Link>
      </Button>
    </div>
  );
}
