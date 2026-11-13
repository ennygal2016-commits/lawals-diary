/**
 * A minimal streaming ZIP writer (PKZIP "stored", no compression) — used for the data export. Photos are already
 * compressed, so storing is fine, and it needs no dependency. Each file is written as soon as its bytes are known;
 * only one file is in memory at a time. Limits: < 65,535 files and < 4 GB in total (no ZIP64).
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(d: Date): { time: number; date: number } {
  return {
    time: (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | Math.floor(d.getUTCSeconds() / 2),
    date: ((d.getUTCFullYear() - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate(),
  };
}

export type ZipFile = { name: string; data: Uint8Array };

const LIMIT = 0xffffffff;

/** Turn an async sequence of files into a ZIP byte stream. */
export function zipStream(files: AsyncIterable<ZipFile>, now = new Date()): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const { time, date } = dosDateTime(now);
  const central: Uint8Array[] = [];
  let offset = 0;
  let count = 0;
  const iterator = files[Symbol.asyncIterator]();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await iterator.next();
      if (!next.done) {
        const { name, data } = next.value;
        const nameBytes = enc.encode(name.replace(/^\/+/, ""));
        const crc = crc32(data);
        if (offset + data.length + 30 + nameBytes.length > LIMIT || count >= 0xfffe) {
          controller.error(new Error("Export too large for a ZIP without ZIP64."));
          return;
        }
        const local = new DataView(new ArrayBuffer(30));
        local.setUint32(0, 0x04034b50, true);
        local.setUint16(4, 20, true); // version needed
        local.setUint16(6, 0x0800, true); // UTF-8 names
        local.setUint16(8, 0, true); // stored
        local.setUint16(10, time, true);
        local.setUint16(12, date, true);
        local.setUint32(14, crc, true);
        local.setUint32(18, data.length, true);
        local.setUint32(22, data.length, true);
        local.setUint16(26, nameBytes.length, true);
        local.setUint16(28, 0, true);

        const dir = new DataView(new ArrayBuffer(46));
        dir.setUint32(0, 0x02014b50, true);
        dir.setUint16(4, 20, true);
        dir.setUint16(6, 20, true);
        dir.setUint16(8, 0x0800, true);
        dir.setUint16(10, 0, true);
        dir.setUint16(12, time, true);
        dir.setUint16(14, date, true);
        dir.setUint32(16, crc, true);
        dir.setUint32(20, data.length, true);
        dir.setUint32(24, data.length, true);
        dir.setUint16(28, nameBytes.length, true);
        dir.setUint32(42, offset, true);
        central.push(new Uint8Array(dir.buffer), nameBytes);

        controller.enqueue(new Uint8Array(local.buffer));
        controller.enqueue(nameBytes);
        controller.enqueue(data);
        offset += 30 + nameBytes.length + data.length;
        count += 1;
        return;
      }

      const centralSize = central.reduce((n, b) => n + b.length, 0);
      for (const part of central) controller.enqueue(part);
      const end = new DataView(new ArrayBuffer(22));
      end.setUint32(0, 0x06054b50, true);
      end.setUint16(8, count, true);
      end.setUint16(10, count, true);
      end.setUint32(12, centralSize, true);
      end.setUint32(16, offset, true);
      controller.enqueue(new Uint8Array(end.buffer));
      controller.close();
    },
    async cancel() {
      await iterator.return?.();
    },
  });
}
