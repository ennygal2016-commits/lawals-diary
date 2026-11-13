import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookPage } from "@/components/books/book-page";
import { PageContainer } from "@/components/shell/page";
import { getBook, getPartners } from "@/server/queries/books";
import { getViewer } from "@/server/queries/viewer";

export const metadata: Metadata = { title: "Book" };

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  const [book, partners] = await Promise.all([getBook((await params).id, viewer.userId), getPartners()]);
  if (!book) notFound();
  return (
    <PageContainer width="medium" className="gap-8">
      <BookPage book={book} partners={partners} />
    </PageContainer>
  );
}
