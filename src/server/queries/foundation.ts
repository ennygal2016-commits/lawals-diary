import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AdminFilters } from "@/lib/validation/foundation";
import type { ApplicationStatus, FoundationApplicationRow, SchoolLevel } from "@/types/database";

export const DOCS_BUCKET = "foundation-docs";
export const PAGE_SIZE = 50;
const URL_TTL = 60 * 10;

export type ApplicationListItem = {
  id: string;
  reference: string;
  applicantName: string;
  school: string;
  level: SchoolLevel;
  classYear: string;
  amountRequested: number;
  status: ApplicationStatus;
  createdAt: string;
};

export type StatusCounts = Record<ApplicationStatus | "all", number>;
const STATUSES: ApplicationStatus[] = ["new", "reviewing", "shortlisted", "approved", "declined", "funded"];

/** Chip counts (PRD FR-34): every status, for the current search and level (the status chip itself excluded). */
export async function getApplicationList(
  f: AdminFilters,
): Promise<{ items: ApplicationListItem[]; counts: StatusCounts; total: number; more: boolean }> {
  const supabase = await createClient();

  // Shared search/level filter; `q` is already reduced to letters, digits, spaces and - ' . (adminFilterSchema).
  const scoped = <Q extends { or: (s: string) => Q; eq: (c: "level", v: SchoolLevel) => Q }>(query: Q) => {
    let out = query;
    if (f.q) out = out.or(`applicant_name.ilike.%${f.q}%,reference.ilike.%${f.q}%,school.ilike.%${f.q}%`);
    if (f.level !== "all") out = out.eq("level", f.level);
    return out;
  };

  const from = (f.page - 1) * PAGE_SIZE;
  let list = scoped(
    supabase
      .from("foundation_applications")
      .select(
        "id, reference, applicant_name, school, level, class_year, amount_requested, status, created_at",
      ),
  );
  if (f.status !== "all") list = list.eq("status", f.status);

  const [{ data }, ...countResults] = await Promise.all([
    list.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE),
    scoped(supabase.from("foundation_applications").select("id", { count: "exact", head: true })),
    ...STATUSES.map((s) =>
      scoped(supabase.from("foundation_applications").select("id", { count: "exact", head: true })).eq(
        "status",
        s,
      ),
    ),
  ]);

  const counts = { all: countResults[0]?.count ?? 0 } as StatusCounts;
  STATUSES.forEach((s, i) => (counts[s] = countResults[i + 1]?.count ?? 0));
  const rows = data ?? [];

  return {
    items: rows.slice(0, PAGE_SIZE).map((r) => ({
      id: r.id,
      reference: r.reference,
      applicantName: r.applicant_name,
      school: r.school,
      level: r.level,
      classYear: r.class_year,
      amountRequested: Number(r.amount_requested),
      status: r.status,
      createdAt: r.created_at,
    })),
    counts,
    total: f.status === "all" ? counts.all : counts[f.status],
    more: rows.length > PAGE_SIZE,
  };
}

export type ApplicationDocument = {
  id: string;
  mime: string;
  size: number;
  url: string | null;
  name: string;
};
export type ApplicationEvent = {
  id: string;
  at: string;
  actor: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus | null;
  note: string | null;
};
export type ApplicationDetail = FoundationApplicationRow & {
  documents: ApplicationDocument[];
  events: ApplicationEvent[];
  receiptUrl: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One application with short-lived document links and its full history (PRD FR-35). */
export async function getApplication(id: string): Promise<ApplicationDetail | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const [{ data: app }, { data: docs }, { data: events }, { data: profiles }] = await Promise.all([
    supabase.from("foundation_applications").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("application_documents")
      .select("id, storage_path, mime, size")
      .eq("application_id", id)
      .order("created_at"),
    supabase
      .from("application_events")
      .select("id, created_at, actor_id, from_status, to_status, note")
      .eq("application_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("user_id, nickname"),
  ]);
  if (!app) return null;

  const paths = [...(docs ?? []).map((d) => d.storage_path), ...(app.receipt_path ? [app.receipt_path] : [])];
  const { data: signed } = paths.length
    ? await supabase.storage.from(DOCS_BUCKET).createSignedUrls(paths, URL_TTL)
    : { data: [] };
  const urlOf = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const names = new Map((profiles ?? []).map((p) => [p.user_id, p.nickname]));

  return {
    ...app,
    amount_requested: Number(app.amount_requested),
    amount_paid: app.amount_paid === null ? null : Number(app.amount_paid),
    documents: (docs ?? []).map((d, i) => ({
      id: d.id,
      mime: d.mime,
      size: d.size,
      url: urlOf.get(d.storage_path) ?? null,
      name: `Document ${i + 1}.${d.mime === "application/pdf" ? "pdf" : "jpg"}`,
    })),
    receiptUrl: app.receipt_path ? (urlOf.get(app.receipt_path) ?? null) : null,
    events: (events ?? []).map((e) => ({
      id: e.id,
      at: e.created_at,
      actor: e.actor_id ? (names.get(e.actor_id) ?? "An admin") : "Applicant",
      fromStatus: e.from_status,
      toStatus: e.to_status,
      note: e.note,
    })),
  };
}
