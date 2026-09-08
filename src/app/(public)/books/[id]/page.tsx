import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toId } from "@/lib/api";
import EpubReader from "@/components/readers/EpubReader";
import TxtReader from "@/components/readers/TxtReader";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const bookId = toId(id);
  if (!bookId) return { title: "图书" };
  const book = await db.book.findUnique({ where: { id: bookId } });
  return { title: book ? `《${book.title}》` : "图书" };
}

export default async function BookReaderPage({ params }: Props) {
  const bookId = toId((await params).id);
  if (!bookId) notFound();
  const book = await db.book.findUnique({ where: { id: bookId } });
  if (!book) notFound();

  return book.format === "epub" ? (
    <EpubReader bookId={book.id} title={book.title} filePath={book.filePath} />
  ) : (
    <TxtReader bookId={book.id} title={book.title} filePath={book.filePath} />
  );
}
