/** Client-safe photo constants (no Zod). Schemas live in lib/validation/photo.ts. */
/** /admin/photos filter chips (PRD FR-25). */
export const PHOTO_FILTERS = [
  { value: "all", label: "All" },
  { value: "gallery", label: "In gallery" },
  { value: "about", label: "On About page" },
  { value: "public-entries", label: "In public entries" },
  { value: "private", label: "Private" },
] as const;
export type PhotoFilter = (typeof PHOTO_FILTERS)[number]["value"];

export const PHOTO_PAGE_SIZE = 40;
export const CAPTION_MAX = 500;
