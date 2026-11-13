import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseEnv } from "@/lib/supabase/env";
import { runDigest } from "@/server/notifications/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false; // fail closed when not configured
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * GET /api/cron/digest (DESIGN.md §9) — called once a day by Vercel Cron (vercel.json), which sends
 * "Authorization: Bearer <CRON_SECRET>". Anyone else gets 401.
 */
export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const report = await runDigest();
  return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
}
