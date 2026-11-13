import { z } from "zod";

import { CAPTION_MAX, PHOTO_FILTERS, PHOTO_PAGE_SIZE, type PhotoFilter } from "@/lib/photos";

export { CAPTION_MAX, PHOTO_FILTERS, PHOTO_PAGE_SIZE, type PhotoFilter };
export const photoFilterSchema = z.enum(PHOTO_FILTERS.map((f) => f.value) as [PhotoFilter, ...PhotoFilter[]]);

export const updatePhotoSchema = z
  .object({
    id: z.uuid(),
    caption: z
      .string()
      .trim()
      .max(CAPTION_MAX, { error: `Keep the caption to ${CAPTION_MAX} characters.` })
      .optional(),
    in_gallery: z.boolean().optional(),
    on_about: z.boolean().optional(),
  })
  .refine((v) => v.caption !== undefined || v.in_gallery !== undefined || v.on_about !== undefined, {
    error: "Nothing to change.",
  });
export type UpdatePhotoInput = z.input<typeof updatePhotoSchema>;
