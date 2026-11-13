import { NextResponse, type NextRequest } from "next/server";

import { PHOTO_MAX_BYTES, PhotoError, processPhoto } from "@/lib/images/photo";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { PHOTOS_MAX } from "@/lib/validation/entry";
import { storeProcessedPhoto } from "@/server/photos/storage";
import { signPaths } from "@/server/queries/photos";
import { isSameOrigin } from "@/lib/http";

// sharp and heic-convert need Node; HEIC decoding can take a few seconds per photo.
export const runtime = "nodejs";
export const maxDuration = 60;

export type UploadResponse = {
  photos: Array<{ id: string; thumbUrl: string | null; width: number; height: number }>;
  errors: Array<{ name: string; message: string }>;
  error?: string;
};

/**
 * POST /api/photos/upload (DESIGN.md §9). Multipart field "photos" (the app sends one file per request so each
 * gets its own progress bar). Each file: ≤ 25 MB → sniffed type (JPEG, PNG, WebP, HEIC) → HEIC converted →
 * oriented → ALL metadata stripped → 400/1200/2400 px as WebP + JPEG in photos-private → photos row.
 * Runs as the signed-in partner, so storage and table RLS apply. Nothing unprocessed is ever stored.
 */
export async function POST(request: NextRequest) {
  const fail = (error: string, status: number) =>
    NextResponse.json({ photos: [], errors: [], error } satisfies UploadResponse, { status });

  if (!isSameOrigin(request.headers)) return fail("Forbidden", 403);

  // Not configured (no Supabase env) → nobody can be signed in.
  if (!supabaseEnv()) return fail("Your session has ended. Sign in again.", 401);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Your session has ended. Sign in again.", 401);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > PHOTOS_MAX * (PHOTO_MAX_BYTES + 1024 * 1024)) return fail("That upload is too large.", 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("That upload didn’t come through.", 400);
  }
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return fail("Choose at least one photo.", 400);
  if (files.length > PHOTOS_MAX) return fail(`Up to ${PHOTOS_MAX} photos at a time.`, 400);

  const body: UploadResponse = { photos: [], errors: [] };
  for (const file of files) {
    const name = file.name.slice(0, 120) || "photo";
    if (file.size > PHOTO_MAX_BYTES) {
      body.errors.push({ name, message: "Over 25 MB." });
      continue;
    }
    try {
      const processed = await processPhoto(Buffer.from(await file.arrayBuffer()));
      const { id, variants } = await storeProcessedPhoto(supabase, user.id, processed);
      const [thumbUrl] = await signPaths(supabase, [variants["400"]?.webp]);
      body.photos.push({ id, thumbUrl: thumbUrl ?? null, width: processed.width, height: processed.height });
    } catch (err) {
      body.errors.push({
        name,
        message: err instanceof PhotoError ? err.message : "Couldn’t save this photo. Try again.",
      });
    }
  }

  return NextResponse.json(body, { status: body.photos.length ? 200 : 422 });
}
