import { NextResponse } from "next/server";

import { parseVariants, variantPath } from "@/lib/images/variants";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { type ZipFile, zipStream } from "@/lib/zip";
import { PHOTO_BUCKET } from "@/server/queries/photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TABLES = [
  "profiles",
  "entries",
  "entry_photos",
  "comments",
  "notes",
  "photos",
  "books",
  "book_quotes",
  "about_page",
  "settings",
  "daily_content",
  "foundation_applications",
  "application_documents",
  "application_events",
] as const;

/**
 * GET /api/export — exportData (PRD FR-42, DESIGN.md §9): a ZIP of every table you can read as JSON, plus each photo
 * in its largest stored size (2400 px JPEG). Originals are never kept (location data is stripped on upload), so this
 * is the best copy there is. Runs as the signed-in partner: RLS decides what is included.
 */
export async function GET() {
  if (!supabaseEnv()) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const data: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: page, error } = await supabase
        .from(table)
        .select("*")
        .range(from, from + 999);
      if (error) return NextResponse.json({ error: `Couldn’t read ${table}.` }, { status: 500 });
      rows.push(...(page ?? []));
      if (!page || page.length < 1000) break;
    }
    data[table] = rows;
  }

  const photos = (data.photos ?? []) as Array<{ id: string; variants: unknown; deleted_at: string | null }>;
  const exportedAt = new Date();

  async function* files(): AsyncGenerator<ZipFile> {
    const enc = new TextEncoder();
    yield {
      name: "README.txt",
      data: enc.encode(
        [
          "Lawal's diary — data export",
          `Exported ${exportedAt.toISOString()}`,
          "",
          "data.json   every table as JSON (entries, comments, notes, photos, books, About page, settings,",
          "            daily library, foundation applications and their history).",
          "photos/     each photo at its largest stored size (2400 px JPEG). Photos are cleaned of location data",
          "            when uploaded, so no original with metadata exists.",
        ].join("\n"),
      ),
    };
    yield {
      name: "data.json",
      data: enc.encode(JSON.stringify({ exported_at: exportedAt.toISOString(), ...data }, null, 2)),
    };

    for (const p of photos) {
      if (p.deleted_at) continue;
      const set = parseVariants(p.variants);
      const path = variantPath(set, "2400", "jpeg") ?? variantPath(set, "2400", "webp");
      if (!path) continue;
      const { data: blob } = await supabase.storage.from(PHOTO_BUCKET).download(path);
      if (!blob) continue;
      yield {
        name: `photos/${p.id}.${path.endsWith(".webp") ? "webp" : "jpg"}`,
        data: new Uint8Array(await blob.arrayBuffer()),
      };
    }
  }

  const stamp = exportedAt.toISOString().slice(0, 10);
  return new Response(zipStream(files(), exportedAt), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="lawals-diary-${stamp}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
