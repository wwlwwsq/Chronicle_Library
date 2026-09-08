import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toId } from "@/lib/api";
import ComicReader from "@/components/readers/ComicReader";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const comicId = toId(id);
  if (!comicId) return { title: "漫画" };
  const comic = await db.comic.findUnique({ where: { id: comicId } });
  return { title: comic ? `《${comic.title}》` : "漫画" };
}

export default async function ComicReaderPage({ params }: Props) {
  const comicId = toId((await params).id);
  if (!comicId) notFound();
  const comic = await db.comic.findUnique({
    where: { id: comicId },
    include: { pages: { orderBy: { pageIndex: "asc" } } },
  });
  if (!comic) notFound();

  return (
    <ComicReader
      comicId={comic.id}
      title={comic.title}
      pages={comic.pages.map((p) => ({ id: p.id, pageIndex: p.pageIndex, path: p.path }))}
    />
  );
}
