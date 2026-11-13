/** True if image bytes contain an EXIF APP1 segment or an XMP packet (shared by unit and e2e tests). */
export function carriesMetadata(buf: Buffer): boolean {
  return (
    buf.includes(Buffer.from("Exif\0\0")) ||
    buf.includes(Buffer.from("http://ns.adobe.com/xap/1.0/")) ||
    buf.includes(Buffer.from("<x:xmpmeta"))
  );
}

/** True if an EXIF block contains a GPS IFD pointer (tag 0x8825, either byte order). */
export function exifHasGps(exif: Buffer): boolean {
  return exif.includes(Buffer.from([0x88, 0x25])) || exif.includes(Buffer.from([0x25, 0x88]));
}
