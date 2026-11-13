import { z } from "zod";

import { EMAIL_MODES, NOTIFICATION_TYPES, type NotificationType } from "@/lib/notifications";

/**
 * Server-side check for Settings → Notifications. Kept apart from lib/notifications.ts so the bell (loaded on
 * every admin page) doesn't ship Zod to the browser.
 */
export const notifyPrefsSchema = z.object(
  Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t, z.enum(EMAIL_MODES)])) as Record<
    NotificationType,
    z.ZodEnum<{ instant: "instant"; daily: "daily"; off: "off" }>
  >,
);
