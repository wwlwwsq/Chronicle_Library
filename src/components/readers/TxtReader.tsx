"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const PAGE_CHARS = 1400;

/** 在标点处尽量断页，避免一句话被切成两半 */
function paginate(text: string, size: number): string[] {
  const pages: string[] = [];
  let rest = text;
  while (rest.length > size) {
    let cut = size;
    const seg = rest.slice(Math.max(0, size - 120), size + 1);
    const m = Math.max(
      seg.lastIndexOf("\n"),
      seg.lastIndexOf("。"),
      seg.lastIndexOf("！"),
      seg.lastIndexOf("？"),
      seg.lastIndexOf("\u201c"),
      seg.lastIndexOf("\u201d")
    );
    if (m >= 0) cut = Math.max(0, size - 120) + m + 1;
    pages.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.trim()) pages.push(rest);
  return pages;
}

export default function TxtReader({
  bookId,
  title,
  filePath,
}: {
  bookId: number;
  title: string;
  filePath: string;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const storageKey = `mbw:txt:${bookId}`;
  const topRef = useRef<HTMLDivElement>(null);

  const pages = useMemo(
    () => (content === null ? [] : paginate(content, PAGE_CHARS)),
    [content]
  );

  useEffect(() => {
    let alive = true;
    fetch(`/api/files/${filePath}`)
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.text();
      })
      .then((text) => {
        if (!alive) return;
        setContent(text);
        const saved = Number(localStorage.getItem(storageKey) || "0");
        setPage(Number.isFinite(saved) ? saved : 0);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [filePath, storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, String(page));
  }, [page, storageKey]);

  const go = (p: number) => {
    setPage(Math.min(Math.max(0, p), Math.max(0, pages.length - 1)));
    topRef.current?.scrollIntoView();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(page - 1);
      if (e.key === "ArrowRight") go(page + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, pages.length]);

  const touchX = useRef(0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-reader-bg">
      <header className="flex h-13 shrink-0 items-center gap-2 border-b border-line/70 px-3 sm:px-5">
        <Link
          href="/books"
          className="rounded-md px-2.5 py-1.5 text-sm text-fog transition-colors hover:text-paper"
        >
          ← 书架
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center font-serif text-sm sm:text-base">
          {title}
        </h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFontSize((s) => Math.max(14, s - 2))}
            className="rounded-md px-2 py-1.5 text-sm text-fog hover:text-paper"
            aria-label="缩小字号"
          >
            A-
          </button>
          <button
            type="button"
            onClick={() => setFontSize((s) => Math.min(30, s + 2))}
            className="rounded-md px-2 py-1.5 text-sm text-fog hover:text-paper"
            aria-label="放大字号"
          >
            A+
          </button>
        </div>
      </header>

      <div
        ref={topRef}
        className="flex-1 overflow-y-auto"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (dx > 48) go(page - 1);
          if (dx < -48) go(page + 1);
        }}
      >
        <article
          className="mx-auto max-w-2xl px-6 py-10 leading-[2] text-reader-text"
          style={{ fontSize }}
        >
          {error && <p className="text-fog">文件加载失败，请返回书架重试。</p>}
          {!error && content === null && <p className="text-fog">正在打开…</p>}
          {!error && content !== null && pages[page]}
        </article>
      </div>

      <footer className="flex h-13 shrink-0 items-center justify-between gap-3 border-t border-line/70 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 0}
          className="rounded-md border border-line/70 px-4 py-1.5 text-sm text-fog transition-colors hover:border-lamp/50 hover:text-paper disabled:opacity-40"
        >
          ← 上一页
        </button>
        <span className="font-mono text-xs text-fog">
          {content === null ? "加载中…" : `${page + 1} / ${pages.length} 页`}
        </span>
        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={content === null || page >= pages.length - 1}
          className="rounded-md border border-line/70 px-4 py-1.5 text-sm text-fog transition-colors hover:border-lamp/50 hover:text-paper disabled:opacity-40"
        >
          下一页 →
        </button>
      </footer>
    </div>
  );
}
