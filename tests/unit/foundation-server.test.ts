import { readFileSync } from "node:fs";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DocumentError, cleanDocument } from "@/lib/images/document";
import { clientIp, memoryLimit } from "@/server/rate-limit";
import { verifyTurnstile } from "@/server/turnstile";
import { carriesMetadata } from "../metadata";

describe("cleanDocument (supporting documents and receipts)", () => {
  it("keeps PDFs exactly as sent", async () => {
    const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
    const out = await cleanDocument(pdf);
    expect(out).toMatchObject({ mime: "application/pdf", ext: "pdf" });
    expect(out.buffer.equals(pdf)).toBe(true);
  });

  it("re-encodes photos as JPEG with orientation applied and no metadata (GPS fixture)", async () => {
    const out = await cleanDocument(readFileSync("tests/fixtures/gps-exif.jpg"));
    expect(out).toMatchObject({ mime: "image/jpeg", ext: "jpg" });
    const meta = await sharp(out.buffer).metadata();
    expect(meta.exif).toBeUndefined();
    expect(carriesMetadata(out.buffer)).toBe(false);
    expect(meta.height! > meta.width!).toBe(true); // orientation 6 applied
  });

  it("shrinks huge scans and flattens transparency", async () => {
    const big = await sharp({
      create: { width: 5000, height: 2000, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();
    const out = await cleanDocument(big);
    const meta = await sharp(out.buffer).metadata();
    expect(meta.width).toBe(3000);
    expect(meta.hasAlpha).toBe(false);
  });

  it("refuses anything that isn't a PDF or a photo, whatever it's called", async () => {
    await expect(cleanDocument(Buffer.from("PK\u0003\u0004 a zip file"))).rejects.toThrow(DocumentError);
    await expect(cleanDocument(Buffer.from("<html><script>alert(1)</script>"))).rejects.toThrow(
      /PDF or a photo/,
    );
    await expect(cleanDocument(Buffer.alloc(0))).rejects.toThrow(/empty/);
    await expect(cleanDocument(Buffer.alloc(10 * 1024 * 1024 + 1, 1))).rejects.toThrow(/10 MB/);
  });
});

describe("rate limit: 5 per IP per hour", () => {
  it("allows five, blocks the sixth, and frees up after the window", () => {
    const t0 = 1_000_000;
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(memoryLimit(key, t0 + i).success).toBe(true);
    expect(memoryLimit(key, t0 + 10).success).toBe(false);
    expect(memoryLimit(key, t0 + 60 * 60 * 1000 + 1).success).toBe(true);
  });

  it("each IP has its own budget", () => {
    const t0 = 2_000_000;
    for (let i = 0; i < 5; i++) memoryLimit("ip-a", t0);
    expect(memoryLimit("ip-a", t0).success).toBe(false);
    expect(memoryLimit("ip-b", t0).success).toBe(true);
  });

  it("reads the client IP from the proxy headers", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("Turnstile", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("without a secret: allowed in development, refused in production (fail closed)", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NODE_ENV", "development");
    expect((await verifyTurnstile(null, "1.2.3.4")).ok).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(await verifyTurnstile("token", "1.2.3.4")).toEqual({ ok: false, reason: "not-configured" });
  });

  it("with a secret: needs a token, and asks Cloudflare", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    expect(await verifyTurnstile(null, "1.2.3.4")).toEqual({ ok: false, reason: "missing-token" });

    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true })));
    vi.stubGlobal("fetch", fetchMock);
    expect((await verifyTurnstile("good", "1.2.3.4")).ok).toBe(true);
    const body = (fetchMock.mock.calls[0] as unknown as [string, { body: URLSearchParams }])[1].body;
    expect(body.get("response")).toBe("good");
    expect(body.get("remoteip")).toBe("1.2.3.4");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ success: false }))),
    );
    expect(await verifyTurnstile("bad", "1.2.3.4")).toEqual({ ok: false, reason: "failed" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    );
    expect(await verifyTurnstile("x", "1.2.3.4")).toEqual({ ok: false, reason: "unreachable" });
  });
});

describe("isSameOrigin (CSRF guard for POST routes)", () => {
  it("matches the Origin host against the Host the request reached", async () => {
    const { isSameOrigin } = await import("@/lib/http");
    const h = (o: Record<string, string>) => new Headers(o);
    expect(isSameOrigin(h({ origin: "http://127.0.0.1:3100", host: "127.0.0.1:3100" }))).toBe(true);
    expect(
      isSameOrigin(
        h({ origin: "https://diary.example", host: "internal:3000", "x-forwarded-host": "diary.example" }),
      ),
    ).toBe(true);
    expect(isSameOrigin(h({ host: "diary.example" }))).toBe(true); // no Origin header
    expect(isSameOrigin(h({ origin: "https://evil.example", host: "diary.example" }))).toBe(false);
    expect(isSameOrigin(h({ origin: "https://diary.example.evil.example", host: "diary.example" }))).toBe(
      false,
    );
    expect(isSameOrigin(h({ origin: "null", host: "diary.example" }))).toBe(false);
    expect(isSameOrigin(h({ origin: "not a url", host: "diary.example" }))).toBe(false);
  });
});
