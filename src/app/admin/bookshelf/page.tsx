import type { Metadata } from "next";

import { Bookshelf } from "@/components/books/bookshelf";
import { PageContainer } from "@/components/shell/page";
import { getPartners, getShelf } from "@/server/queries/books";
import { getViewer } from "@/server/queries/viewer";

export const metadata: Metadata = { title: "Bookshelf" };

/** /admin/bookshelf — 1150 wide (DESIGN.md §4). */
export default async function BookshelfPage() {
  await getViewer();
  const [books, partners] = await Promise.all([getShelf(), getPartners()]);
  return (
    <PageContainer width="wide" className="gap-10">
      <Bookshelf books={books} partners={partners} />
    </PageContainer>
  );
}
