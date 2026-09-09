"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authFetch, toId } from "@/lib/api-base";
import ComicReader, { type ComicPageItem } from "@/components/readers/ComicReader";

type Comic = {
  id: number;
  title: string;
  pages: { id: number; pageIndex: number; path: string }[];
};

export default function ComicReaderPageClient() {
  const params = useParams<{ id: string }>();
  const comicId = toId(Array.isArray(params?.id) ? params.id[0] : params?.id);
  const invalid = !comicId;
  const [comic, setComic] = useState<Comic | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!comicId) return;
    let alive = true;
    authFetch(`/api/comics/${comicId}`)
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.json();
      })
      .then((d) => alive && setComic(d))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [comicId]);

  if (invalid || missing) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-serif text-2xl">这部漫画不在匣中</p>
        <Link href="/comics" className="text-sm text-lamp-2 hover:underline">
          ← 回画匣
        </Link>
      </div>
    );
  }

  if (!comic) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-fog">正在翻开画匣…</p>
      </div>
    );
  }

  const pages: ComicPageItem[] = (comic.pages || [])
    .slice()
    .sort((a, b) => a.pageIndex - b.pageIndex)
    .map((p) => ({ id: p.id, pageIndex: p.pageIndex, path: p.path }));

  return (
    <ComicReader comicId={comic.id} title={comic.title} pages={pages} />
  );
}
