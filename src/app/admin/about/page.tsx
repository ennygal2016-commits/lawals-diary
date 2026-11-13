import type { Metadata } from "next";

import { AboutEditor } from "@/components/about/about-editor";
import { PageContainer } from "@/components/shell/page";
import { getAboutEditor } from "@/server/queries/about";
import { getViewer } from "@/server/queries/viewer";

export const metadata: Metadata = { title: "About Us editor" };

/** /admin/about (PRD FR-39). */
export default async function AboutEditorPage() {
  await getViewer();
  const data = await getAboutEditor();
  return (
    <PageContainer width="narrow">
      <AboutEditor
        initial={data.draft}
        thumbs={data.thumbs}
        publishedAt={data.publishedAt}
        unpublishedChanges={data.unpublishedChanges}
      />
    </PageContainer>
  );
}
