import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/shell/page";
import { ToastProvider } from "@/components/ui/toast";
import { SettingsPreview } from "../phase11-previews";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings preview", robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();
  return (
    <ToastProvider>
      <main id="main" className="pb-24">
        <PageContainer width="narrow">
          <h1 className="page-title m-0">Settings</h1>
          <SettingsPreview />
        </PageContainer>
      </main>
    </ToastProvider>
  );
}
