import type { Metadata } from "next";
import { GraduationCap, HeartHandshake, ShieldCheck } from "lucide-react";

import { ApplicationForm } from "@/components/foundation/application-form";

export const metadata: Metadata = {
  title: "Foundation",
  description: "Apply for help with school fees and study costs.",
};

const POINTS = [
  {
    icon: GraduationCap,
    title: "Who can apply",
    text: "Students at primary, secondary, tertiary or vocational level.",
  },
  {
    icon: HeartHandshake,
    title: "What we fund",
    text: "Scholarships and school fees, considered one application at a time.",
  },
  {
    icon: ShieldCheck,
    title: "Your privacy",
    text: "Only the two of us read applications. Documents are kept private.",
  },
];

/**
 * Public /foundation (PRD FR-32): what the scholarship is, then the application form. Placeholder intro copy —
 * editable later with the About Us editor (Phase 11).
 */
export default function FoundationPage() {
  return (
    <div className="mx-auto flex max-w-[824px] flex-col gap-12 px-5 pt-10 pb-24 md:px-8 md:pt-16">
      <header className="flex flex-col gap-5">
        <p className="eyebrow m-0 text-lavender-text">Scholarships and school fees</p>
        <h1 className="page-title m-0">Foundation</h1>
        <p className="m-0 text-[18px] leading-relaxed text-fg-soft">
          A small foundation in our name that helps students stay in school. If you or your child need help
          with school fees or study costs, tell us about it below. We read every application ourselves.
        </p>
        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-3">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="flex flex-col gap-2 rounded-card border border-border bg-lavender-soft/40 p-5"
            >
              <Icon aria-hidden className="size-5 text-lavender" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-fg">{title}</span>
              <span className="text-[14px] leading-relaxed text-muted">{text}</span>
            </li>
          ))}
        </ul>
      </header>

      <section aria-labelledby="apply-heading" className="flex flex-col gap-6">
        <div>
          <h2 id="apply-heading" className="serif m-0 text-[36px] leading-tight">
            Apply
          </h2>
          <p className="mt-2 mb-0 text-[15px] text-muted">
            Fields marked <span className="text-accent">*</span> are required. It takes about ten minutes.
          </p>
        </div>
        <ApplicationForm />
      </section>
    </div>
  );
}
