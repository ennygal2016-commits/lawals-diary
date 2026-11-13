"use client";

import * as React from "react";

import type { FoundationActions } from "@/components/foundation/admin-controls";
import { FoundationAdminDetail } from "@/components/foundation/admin-detail";
import type { ApplicationDetail } from "@/server/queries/foundation";

/** The real detail view with in-memory actions that just report success. */
export function FoundationDetailPreview({ app }: { app: ApplicationDetail }) {
  const actions: FoundationActions = React.useMemo(
    () => ({
      setStatus: async ({ status }) => ({ ok: true, message: `Marked ${status}.` }),
      addNote: async () => ({ ok: true, message: "Note added." }),
      recordPayment: async () => ({ ok: true, message: "Payment recorded." }),
    }),
    [],
  );
  return (
    <FoundationAdminDetail app={app} today="2026-11-03" base="/styleguide/foundation" actions={actions} />
  );
}
