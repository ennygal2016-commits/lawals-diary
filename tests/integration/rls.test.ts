/**
 * Phase 2 security proof, run against the Supabase dev project from .env.local (npm run test:db).
 * The service role plants one row in every private table and one object in each private bucket; an anonymous
 * client must not be able to read any of it. Skips when the project isn't configured.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Database, PRIVATE_TABLES } from "@/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && anonKey && serviceKey);

const TAG = `rls-test-${randomUUID().slice(0, 8)}`;
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

describe.skipIf(!configured)("anonymous access (RLS + storage)", () => {
  let service: SupabaseClient<Database>;
  let anon: SupabaseClient<Database>;
  const planted: Partial<Record<(typeof PRIVATE_TABLES)[number], string>> = {};
  const objects: Array<{ bucket: string; path: string }> = [];

  beforeAll(async () => {
    const opts = { auth: { persistSession: false, autoRefreshToken: false } } as const;
    service = createClient<Database>(url!, serviceKey!, opts);
    anon = createClient<Database>(url!, anonKey!, opts);

    const { data: profiles, error } = await service
      .from("profiles")
      .select("user_id, partner")
      .order("partner");
    if (error || !profiles || profiles.length !== 2) {
      throw new Error("Run the migrations and `npm run db:seed` first (both profiles must exist).");
    }
    const a = profiles[0]!.user_id;
    const b = profiles[1]!.user_id;

    const one = async <T extends { id: string }>(
      label: string,
      op: PromiseLike<{ data: T | null; error: { message: string } | null }>,
    ) => {
      const { data, error: e } = await op;
      if (e || !data) throw new Error(`${label}: ${e?.message}`);
      return data.id;
    };

    planted.photos = await one(
      "photo",
      service
        .from("photos")
        .insert({ uploader_id: a, storage_path: `${TAG}/photo.webp` })
        .select("id")
        .single(),
    );
    planted.entries = await one(
      "entry",
      service
        .from("entries")
        .insert({ author_id: a, title: TAG, body_text: "private words", status: "published" })
        .select("id")
        .single(),
    );
    planted.entry_photos = await one(
      "entry_photo",
      service
        .from("entry_photos")
        .insert({ entry_id: planted.entries, photo_id: planted.photos })
        .select("id")
        .single(),
    );
    planted.comments = await one(
      "comment",
      service
        .from("comments")
        .insert({ entry_id: planted.entries, author_id: b, body: TAG })
        .select("id")
        .single(),
    );
    planted.notes = await one(
      "note",
      service.from("notes").insert({ from_id: a, to_id: b, body: TAG }).select("id").single(),
    );
    planted.notifications = await one(
      "notification",
      service.from("notifications").insert({ user_id: b, type: "note" }).select("id").single(),
    );
    planted.books = await one("book", service.from("books").insert({ title: TAG }).select("id").single());
    planted.book_quotes = await one(
      "quote",
      service.from("book_quotes").insert({ book_id: planted.books, text: TAG }).select("id").single(),
    );
    planted.foundation_applications = await one(
      "application",
      service
        .from("foundation_applications")
        .insert({
          reference: `FDN-2099-${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`,
          applicant_name: TAG,
          applicant_dob: "2010-01-01",
          school: "Test School",
          level: "secondary",
          class_year: "JSS2",
          amount_requested: 100,
          reason: "test",
        })
        .select("id")
        .single(),
    );
    planted.application_documents = await one(
      "document",
      service
        .from("application_documents")
        .insert({
          application_id: planted.foundation_applications,
          storage_path: `${TAG}/doc.png`,
          mime: "image/png",
          size: PNG_1PX.byteLength,
        })
        .select("id")
        .single(),
    );
    planted.application_events = await one(
      "event",
      service
        .from("application_events")
        .insert({ application_id: planted.foundation_applications, to_status: "new" })
        .select("id")
        .single(),
    );

    for (const bucket of ["photos-private", "foundation-docs"]) {
      const path = `${TAG}/secret.png`;
      const { error: upErr } = await service.storage
        .from(bucket)
        .upload(path, PNG_1PX, { contentType: "image/png" });
      if (upErr) throw new Error(`upload ${bucket}: ${upErr.message}`);
      objects.push({ bucket, path });
    }
  });

  afterAll(async () => {
    if (!service) return;
    for (const { bucket, path } of objects) await service.storage.from(bucket).remove([path]);
    if (planted.foundation_applications) {
      await service.from("foundation_applications").delete().eq("id", planted.foundation_applications);
    }
    if (planted.books) await service.from("books").delete().eq("id", planted.books);
    if (planted.notifications) await service.from("notifications").delete().eq("id", planted.notifications);
    if (planted.notes) await service.from("notes").delete().eq("id", planted.notes);
    if (planted.entries) await service.from("entries").delete().eq("id", planted.entries);
    if (planted.photos) await service.from("photos").delete().eq("id", planted.photos);
  });

  it.each(PRIVATE_TABLES)("anon cannot read any row of %s", async (table) => {
    const { data, error } = await anon.from(table).select("*").limit(5);
    // Either refused outright (no grant) or filtered to nothing by RLS — never rows.
    expect(error !== null || (data ?? []).length === 0, `${table} leaked ${JSON.stringify(data)}`).toBe(true);
  });

  it("the service role really did plant rows (so the test above means something)", async () => {
    const { count } = await service
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("title", TAG);
    expect(count).toBe(1);
    const { count: apps } = await service
      .from("foundation_applications")
      .select("id", { count: "exact", head: true })
      .eq("applicant_name", TAG);
    expect(apps).toBe(1);
  });

  it("anon cannot read foundation applications, documents or their history in any way", async () => {
    for (const table of ["foundation_applications", "application_documents", "application_events"] as const) {
      const { data, error } = await anon.from(table).select("*").eq("id", planted[table]!);
      expect(error !== null || (data ?? []).length === 0).toBe(true);
      const { count } = await anon.from(table).select("id", { count: "exact", head: true });
      expect(count ?? 0).toBe(0);
    }
  });

  it("anon cannot write to private tables", async () => {
    const { error: insertError } = await anon.from("foundation_applications").insert({
      reference: "FDN-2099-9999",
      applicant_name: "x",
      applicant_dob: "2010-01-01",
      school: "x",
      level: "primary",
      class_year: "x",
      amount_requested: 1,
      reason: "x",
    });
    expect(insertError).not.toBeNull();

    const { error: entryError } = await anon.from("entries").insert({ author_id: randomUUID(), title: "x" });
    expect(entryError).not.toBeNull();

    await anon.from("profiles").update({ nickname: "hacked" }).neq("nickname", "");
    const { data: nicknames } = await service.from("profiles").select("nickname");
    expect(nicknames?.map((p) => p.nickname)).not.toContain("hacked");
  });

  it("anon cannot call is_admin() or see the allowlist", async () => {
    const { data } = await anon.rpc("is_admin");
    expect(data === null || data === false).toBe(true);
    const { data: allowlist, error } = await anon.from("admin_allowlist").select("email");
    expect(error !== null || (allowlist ?? []).length === 0).toBe(true);
  });

  it.each(["photos-private", "foundation-docs"])(
    "anon cannot list, download or sign objects in %s",
    async (bucket) => {
      const object = objects.find((o) => o.bucket === bucket)!;
      const store = anon.storage.from(bucket);

      const { data: listed } = await store.list(TAG);
      expect(listed ?? []).toHaveLength(0);

      const { data: downloaded, error: downloadError } = await store.download(object.path);
      expect(downloaded).toBeNull();
      expect(downloadError).not.toBeNull();

      const { data: signed } = await store.createSignedUrl(object.path, 60);
      expect(signed?.signedUrl ?? null).toBeNull();

      const publicUrl = store.getPublicUrl(object.path).data.publicUrl;
      expect((await fetch(publicUrl)).ok).toBe(false);

      const { error: uploadError } = await store.upload(`${TAG}/anon.png`, PNG_1PX, {
        contentType: "image/png",
      });
      expect(uploadError).not.toBeNull();
    },
  );

  it("anon can read the public views, which hide private entries", async () => {
    const { data, error } = await anon.from("public_entries").select("id, title");
    expect(error).toBeNull();
    expect((data ?? []).map((e) => e.title)).not.toContain(TAG);

    const { data: photos, error: photoError } = await anon.from("public_photos").select("id");
    expect(photoError).toBeNull();
    expect((photos ?? []).map((p) => p.id)).not.toContain(planted.photos);

    const { error: aboutError } = await anon.from("public_about").select("couple_names");
    expect(aboutError).toBeNull();
  });

  it("the allowlist trigger rejects any other email, even from the service role", async () => {
    const { data, error } = await service.auth.admin.createUser({
      email: `${TAG}@example.com`,
      password: randomUUID(),
      email_confirm: true,
    });
    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });
});
