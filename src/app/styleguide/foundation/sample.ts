import type { AdminFilters } from "@/lib/validation/foundation";
import type { ApplicationDetail, ApplicationListItem, StatusCounts } from "@/server/queries/foundation";
import type { ApplicationStatus, SchoolLevel } from "@/types/database";

/** Sample applications for the /styleguide/foundation previews (no database). */
const NAMES = [
  "Tolu Adeyemi",
  "Chidi Okafor",
  "Amina Bello",
  "Grace Mensah",
  "David Eze",
  "Zainab Musa",
  "Kemi Ola",
];
const SCHOOLS = ["University of Lagos", "Kings College", "St. Anne’s Primary", "Yaba College of Technology"];
const LEVELS: SchoolLevel[] = ["tertiary", "secondary", "primary", "vocational"];
const STATUSES: ApplicationStatus[] = [
  "new",
  "new",
  "reviewing",
  "shortlisted",
  "approved",
  "declined",
  "funded",
];

export const SAMPLE_APPS: ApplicationListItem[] = NAMES.map((name, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  reference: `FDN-2026-${String(42 - i).padStart(4, "0")}`,
  applicantName: name,
  school: SCHOOLS[i % SCHOOLS.length]!,
  level: LEVELS[i % LEVELS.length]!,
  classYear: ["Year 2", "SS1", "Primary 5", "ND1"][i % 4]!,
  amountRequested: [1250, 480, 300, 900, 650, 400, 1500][i]!,
  status: STATUSES[i]!,
  createdAt: new Date(Date.UTC(2026, 10, 3 - i, 15)).toISOString(),
}));

export function sampleList(f: AdminFilters, empty: boolean) {
  const all = empty ? [] : SAMPLE_APPS;
  const q = f.q.toLowerCase();
  const scoped = all.filter(
    (a) =>
      (!q || [a.applicantName, a.reference, a.school].some((v) => v.toLowerCase().includes(q))) &&
      (f.level === "all" || a.level === f.level),
  );
  const counts = { all: scoped.length } as StatusCounts;
  for (const s of ["new", "reviewing", "shortlisted", "approved", "declined", "funded"] as const) {
    counts[s] = scoped.filter((a) => a.status === s).length;
  }
  const items = f.status === "all" ? scoped : scoped.filter((a) => a.status === f.status);
  return { items, counts, total: items.length, more: false };
}

const PNG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#f2edf5"/><text x="24" y="60" font-family="monospace" font-size="22" fill="#0e0c14">School fees invoice</text><rect x="24" y="90" width="300" height="10" fill="#a49db0"/><rect x="24" y="120" width="260" height="10" fill="#a49db0"/></svg>',
  );

export function sampleDetail(status: ApplicationStatus = "funded"): ApplicationDetail {
  const base = SAMPLE_APPS[0]!;
  return {
    id: base.id,
    reference: base.reference,
    applicant_name: base.applicantName,
    applicant_dob: "2009-05-01",
    applicant_phone: "+234 803 555 0101",
    applicant_email: "tolu@example.com",
    guardian_name: "Funmi Adeyemi",
    guardian_relationship: "Mother",
    guardian_phone: "+234 803 555 0199",
    guardian_email: "funmi@example.com",
    school: base.school,
    level: "secondary",
    class_year: "SS2",
    amount_requested: 1250,
    currency: "CAD",
    reason:
      "School fees for the next two terms. My mother’s shop closed in June and we fell behind.\n\nI am in the top five of my class.",
    consent_data: true,
    consent_contact: true,
    status,
    admin_notes: null,
    amount_paid: status === "funded" ? 1250 : null,
    paid_on: status === "funded" ? "2026-11-02" : null,
    receipt_path: status === "funded" ? "receipts/x.pdf" : null,
    created_at: base.createdAt,
    updated_at: base.createdAt,
    receiptUrl: status === "funded" ? "#receipt" : null,
    documents: [
      { id: "d1", mime: "image/jpeg", size: 182_000, url: PNG, name: "Document 1.jpg" },
      { id: "d2", mime: "application/pdf", size: 96_000, url: "#pdf", name: "Document 2.pdf" },
    ],
    events: [
      {
        id: "e4",
        at: "2026-11-03T15:20:00Z",
        actor: "D_Gal",
        fromStatus: null,
        toStatus: null,
        note: "Payment recorded: CA$1,250.00 on 2026-11-02 (receipt attached)",
      },
      {
        id: "e3",
        at: "2026-11-02T18:00:00Z",
        actor: "Kuleo",
        fromStatus: "approved",
        toStatus: "funded",
        note: null,
      },
      {
        id: "e2",
        at: "2026-10-30T12:10:00Z",
        actor: "D_Gal",
        fromStatus: null,
        toStatus: null,
        note: "Called the school — fees confirmed.",
      },
      {
        id: "e1",
        at: "2026-10-28T09:00:00Z",
        actor: "Applicant",
        fromStatus: null,
        toStatus: "new",
        note: "Submitted through the public form",
      },
    ],
  };
}
