import Link from "next/link";
import { ArrowLeft, FileText, Receipt } from "lucide-react";

import { ageOn, levelLabel, statusLabel } from "@/lib/validation/foundation";
import type { ApplicationDetail } from "@/server/queries/foundation";
import { type FoundationActions, NoteForm, PaymentForm, StatusChanger } from "./admin-controls";
import { StatusPill, formatCad } from "./status-pill";

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Toronto",
  }).format(new Date(iso));

function Section({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 md:p-7"
    >
      <h2 id={id} className="serif m-0 text-[26px] leading-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Facts({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="m-0 grid gap-x-6 gap-y-3 sm:grid-cols-[180px_1fr]">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="eyebrow pt-0.5">{k}</dt>
          <dd className="m-0 text-[15px] break-words text-fg">
            {v ?? <span className="text-faint">—</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** /admin/foundation/[id] (PRD FR-35): every field, documents, status, private notes, payment, history. */
export function FoundationAdminDetail({
  app,
  today,
  base = "/admin/foundation",
  actions,
}: {
  app: ApplicationDetail;
  today: string;
  base?: string;
  actions?: FoundationActions;
}) {
  const age = ageOn(app.applicant_dob, today);
  const mail = (e: string | null) => (e ? <a href={`mailto:${e}`}>{e}</a> : null);
  const tel = (p: string | null) => (p ? <a href={`tel:${p.replace(/[^+\d]/g, "")}`}>{p}</a> : null);

  return (
    <>
      <Link href={base} className="inline-flex items-center gap-2 text-[14px] text-fg-soft no-underline">
        <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
        All applications
      </Link>

      <header className="flex flex-col gap-3">
        <p className="eyebrow m-0">
          {app.reference} · received {when(app.created_at)}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="page-title m-0">{app.applicant_name}</h1>
          <StatusPill status={app.status} />
        </div>
        <p className="m-0 text-[16px] text-fg-soft">
          {app.school} · {levelLabel(app.level)} · {app.class_year} · asking {formatCad(app.amount_requested)}
        </p>
      </header>

      <Section title="Status" id="status-heading">
        <StatusChanger id={app.id} status={app.status} actions={actions} />
      </Section>

      {app.status === "funded" ? (
        <Section title="Payment" id="payment-heading">
          {app.amount_paid !== null ? (
            <p className="m-0 flex flex-wrap items-center gap-3 text-[15px] text-fg">
              Paid <strong>{formatCad(app.amount_paid)}</strong>
              {app.paid_on ? <> on {app.paid_on}</> : null}
              {app.receiptUrl ? (
                <a
                  href={app.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5"
                >
                  <Receipt aria-hidden className="size-4" strokeWidth={1.75} />
                  Receipt
                </a>
              ) : null}
            </p>
          ) : (
            <p className="m-0 text-[15px] text-muted">No payment recorded yet.</p>
          )}
          <PaymentForm
            id={app.id}
            amount={app.amount_paid}
            paidOn={app.paid_on}
            hasReceipt={Boolean(app.receipt_path)}
            today={today}
            actions={actions}
          />
        </Section>
      ) : null}

      <Section title="Applicant" id="applicant-heading">
        <Facts
          items={[
            ["Name", app.applicant_name],
            ["Date of birth", `${app.applicant_dob} (${age})`],
            ["Phone", tel(app.applicant_phone)],
            ["Email", mail(app.applicant_email)],
          ]}
        />
      </Section>

      <Section title="Parent or guardian" id="guardian-heading">
        <Facts
          items={[
            ["Name", app.guardian_name],
            ["Relationship", app.guardian_relationship],
            ["Phone", tel(app.guardian_phone)],
            ["Email", mail(app.guardian_email)],
          ]}
        />
      </Section>

      <Section title="School and request" id="request-heading">
        <Facts
          items={[
            ["School", app.school],
            ["Level", levelLabel(app.level)],
            ["Class or year", app.class_year],
            ["Amount requested", formatCad(app.amount_requested)],
            ["Consent to assess", app.consent_data ? "Yes" : "No"],
            ["Consent to contact", app.consent_contact ? "Yes" : "No"],
          ]}
        />
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Reason</span>
          <p className="m-0 text-[15px] leading-relaxed whitespace-pre-line text-fg-soft">{app.reason}</p>
        </div>
      </Section>

      <Section title="Documents" id="documents-heading">
        {app.documents.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">No documents were sent.</p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
            {app.documents.map((d) => (
              <li key={d.id}>
                <a
                  href={d.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col gap-2 rounded-tile border border-border bg-raised p-2 text-fg-soft no-underline hover:border-border-strong"
                >
                  {d.mime.startsWith("image/") && d.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                    <img
                      src={d.url}
                      alt={`${d.name} preview`}
                      className="aspect-[4/3] w-full rounded-[8px] object-cover"
                    />
                  ) : (
                    <span className="flex aspect-[4/3] w-full items-center justify-center rounded-[8px] bg-overlay">
                      <FileText aria-hidden className="size-8 text-muted" strokeWidth={1.5} />
                    </span>
                  )}
                  <span className="flex items-center justify-between gap-2 px-1 text-[13px]">
                    <span className="truncate">{d.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-faint">
                      {Math.ceil(d.size / 1024)} KB
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="m-0 text-[13px] text-faint">
          Links expire after 10 minutes; reload the page for fresh ones.
        </p>
      </Section>

      <Section title="Private notes and history" id="history-heading">
        <NoteForm id={app.id} actions={actions} />
        <ol aria-label="History" className="m-0 flex list-none flex-col p-0">
          {app.events.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 border-t border-divider-soft py-3">
              <span className="font-mono text-[12px] text-muted uppercase">
                {when(e.at)} · {e.actor}
              </span>
              {e.toStatus ? (
                <span className="text-[15px] text-fg">
                  {e.fromStatus ? (
                    <>
                      {statusLabel(e.fromStatus)} → <strong>{statusLabel(e.toStatus)}</strong>
                    </>
                  ) : (
                    <strong>{statusLabel(e.toStatus)}</strong>
                  )}
                </span>
              ) : null}
              {e.note ? <span className="text-[15px] whitespace-pre-line text-fg-soft">{e.note}</span> : null}
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
