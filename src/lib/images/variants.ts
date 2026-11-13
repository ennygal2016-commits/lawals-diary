/**
 * Shape of photos.variants / photos.public_variants:
 *   { "400": { "webp": "photos/<uid>/<id>/400.webp", "jpeg": ".../400.jpg" }, "1200": {…}, "2400": {…} }
 * Pure helpers, safe on client and server. (Phase 5 stub rows stored "400": "<path>.webp" — still understood.)
 */
export const VARIANT_SIZES = ["400", "1200", "2400"] as const;
export type VariantSize = (typeof VARIANT_SIZES)[number];
export type VariantFormat = "webp" | "jpeg";
export type VariantSet = Partial<Record<VariantSize, Partial<Record<VariantFormat, string>>>>;

export function parseVariants(json: unknown): VariantSet {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  const raw = json as Record<string, unknown>;
  const out: VariantSet = {};
  for (const size of VARIANT_SIZES) {
    const v = raw[size];
    if (typeof v === "string") out[size] = { webp: v };
    else if (v && typeof v === "object" && !Array.isArray(v)) {
      const f = v as Record<string, unknown>;
      const entry: Partial<Record<VariantFormat, string>> = {};
      if (typeof f.webp === "string") entry.webp = f.webp;
      if (typeof f.jpeg === "string") entry.jpeg = f.jpeg;
      if (entry.webp || entry.jpeg) out[size] = entry;
    }
  }
  return out;
}

/** The path for a size/format, falling back to the nearest size that exists. */
export function variantPath(set: VariantSet, size: VariantSize, format: VariantFormat): string | undefined {
  const order: VariantSize[] =
    size === "400"
      ? ["400", "1200", "2400"]
      : size === "1200"
        ? ["1200", "2400", "400"]
        : ["2400", "1200", "400"];
  for (const s of order) {
    const p = set[s]?.[format];
    if (p) return p;
  }
  return undefined;
}

export function allVariantPaths(set: VariantSet): string[] {
  return VARIANT_SIZES.flatMap((s) => [set[s]?.webp, set[s]?.jpeg]).filter((p): p is string => Boolean(p));
}
