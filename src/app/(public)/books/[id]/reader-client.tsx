"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authFetch, toId } from "@/lib/api-base";
import EpubReader from "@/components/readers/EpubReader";
import TxtReader from "@/components/readers/TxtReader";

type Book = {
  id: number;
  title: string;
  format: string;
  filePath: string;
};

export default function ReaderClient() {
  const params = useParams<{ id: string }>();
  const bookId = toId(Array.isArray(params?.id) ? params.id[0] : params?.id);
  const invalid = !bookId;
  const [book, setBook] = useState<Book | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    let alive = true;
    authFetch(`/api/books/${bookId}`)
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.json();
      })
      .then((d) => alive && setBook(d))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [bookId]);

  // 404：让 Next 渲染 not-found（静态导出下为 404 页面内容）
  useEffect(() => {
    if (missing) document.title = "图书不存在";
  }, [missing]);

  if (invalid || missing) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-serif text-2xl">这本书不在架上</p>
        <Link href="/books" className="text-sm text-lamp-2 hover:underline">
          ← 回书架
        </Link>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-fog">正在打开这本书…</p>
      </div>
    );
  }

  return book.format === "epub" ? (
    <EpubReader bookId={book.id} title={book.title} filePath={book.filePath} />
  ) : (
    <TxtReader bookId={book.id} title={book.title} filePath={book.filePath} />
  );
}
