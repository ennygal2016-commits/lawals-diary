import { describe, expect, it } from "vitest";

import { crc32, zipStream } from "@/lib/zip";

async function collect(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const parts: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
  }
  return Buffer.concat(parts);
}

/** A tiny independent reader: walk the central directory and pull each file back out. */
function unzip(buf: Buffer): Map<string, Buffer> {
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  const out = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    expect(buf.readUInt32LE(p)).toBe(0x02014b50);
    const crc = buf.readUInt32LE(p + 16);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    expect(buf.readUInt32LE(local)).toBe(0x04034b50);
    const localName = buf.readUInt16LE(local + 26);
    const data = buf.subarray(local + 30 + localName, local + 30 + localName + size);
    expect(crc32(data)).toBe(crc);
    out.set(name, data);
    p += 46 + nameLen;
  }
  return out;
}

describe("zip writer (data export)", () => {
  it("crc32 matches the standard check values", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it("round-trips several files, including UTF-8 names and binary data", async () => {
    const binary = new Uint8Array(70_000).map((_, i) => (i * 31) % 256);
    async function* files() {
      yield { name: "data.json", data: new TextEncoder().encode('{"hello":"world"}') };
      yield { name: "photos/Nurat’s day.jpg", data: binary };
      yield { name: "empty.txt", data: new Uint8Array() };
    }
    const zip = await collect(zipStream(files(), new Date("2026-11-03T12:00:00Z")));
    expect(zip.subarray(0, 4).toString("hex")).toBe("504b0304");
    const out = unzip(zip);
    expect([...out.keys()]).toEqual(["data.json", "photos/Nurat’s day.jpg", "empty.txt"]);
    expect(out.get("data.json")!.toString()).toBe('{"hello":"world"}');
    expect(Buffer.compare(out.get("photos/Nurat’s day.jpg")!, Buffer.from(binary))).toBe(0);
    expect(out.get("empty.txt")!.length).toBe(0);
  });
});
