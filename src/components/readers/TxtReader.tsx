"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BookmarkPanel, { type BookmarkView } from "./BookmarkPanel";
import {
  loadBookmarks,
  newBookmarkId,
  saveBookmarks,
  type TxtBookmark,
} from "@/lib/bookmarks";
import { fileUrl } from "@/lib/api-base";

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
  // 书签：按页定位（页码随分页算法稳定，书籍文件未替换时跳转精确）
  const [bookmarks, setBookmarks] = useState<TxtBookmark[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bmNotice, setBmNotice] = useState<string | null>(null);
  const [bmHighlight, setBmHighlight] = useState<string | null>(null);
  const storageKey = `mbw:txt:${bookId}`;
  const topRef = useRef<HTMLDivElement>(null);
  // 内容加载完成（含进度恢复）前不持久化页码：
  // 否则挂载瞬间 effect 会先把 0 写进 localStorage，覆盖真正的存档
  const progressLoadedRef = useRef(false);

  // 书签独立于阅读进度：挂载即恢复。运行时校验页码字段，过滤旧版本/损坏条目
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时从 localStorage 恢复，SSR 无该 API
    setBookmarks(
      loadBookmarks<TxtBookmark>(bookId).filter(
        (b) => Number.isInteger(b.page) && b.page >= 0
      )
    );
  }, [bookId]);

  const pages = useMemo(
    () => (content === null ? [] : paginate(content, PAGE_CHARS)),
    [content]
  );

  useEffect(() => {
    let alive = true;
    fetch(fileUrl(filePath))
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.text();
      })
      .then((text) => {
        if (!alive) return;
        setContent(text);
        const saved = Number(localStorage.getItem(storageKey) || "0");
        setPage(Number.isFinite(saved) && saved > 0 ? Math.floor(saved) : 0);
        progressLoadedRef.current = true;
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [filePath, storageKey]);

  // 文件被替换后分页数可能变少：展示与持久化统一用夹取后的页码
  const safePage = Math.min(Math.max(0, page), Math.max(0, pages.length - 1));

  useEffect(() => {
    if (!progressLoadedRef.current) return;
    localStorage.setItem(storageKey, String(safePage));
  }, [safePage, storageKey]);

  const go = useCallback(
    (p: number) => {
      setPage(Math.min(Math.max(0, p), Math.max(0, pages.length - 1)));
      topRef.current?.scrollIntoView();
    },
    [pages.length]
  );

  // ---------- 书签 ----------
  const bmTimer = useRef<number | undefined>(undefined);
  const flashBmNotice = (msg: string, highlight?: string) => {
    setBmNotice(msg);
    setBmHighlight(highlight ?? null);
    window.clearTimeout(bmTimer.current);
    bmTimer.current = window.setTimeout(() => {
      setBmNotice(null);
      setBmHighlight(null);
    }, 2400);
  };
  useEffect(() => () => window.clearTimeout(bmTimer.current), []);

  const commitBms = (next: TxtBookmark[]) => {
    setBookmarks(next);
    saveBookmarks(bookId, next);
  };

  const addBookmark = (name: string) => {
    if (content === null || pages.length === 0) {
      flashBmNotice("书籍尚未加载完成，稍后再试");
      return;
    }
    const dup = bookmarks.find((b) => b.page === safePage);
    if (dup) {
      flashBmNotice("这一页已经有书签了", dup.id);
      return;
    }
    commitBms([
      ...bookmarks,
      {
        id: newBookmarkId(),
        name: name.slice(0, 60),
        page: safePage,
        createdAt: Date.now(),
      },
    ]);
  };

  const jumpBookmark = (id: string) => {
    const bm = bookmarks.find((b) => b.id === id);
    if (!bm) return;
    if (content === null) {
      flashBmNotice("书籍尚未加载完成，稍后再试");
      return;
    }
    // 文件被替换后保存页码可能越界：显式夹取以识别失效书签
    const target = Math.min(Math.max(0, bm.page), Math.max(0, pages.length - 1));
    go(target);
    if (target !== bm.page) {
      // 与 EPUB 失效提示保持一致：面板保持打开，让提示可见
      flashBmNotice("书签指向的页码已超出当前文件，已跳到最接近的位置");
      return;
    }
    setShowBookmarks(false);
  };

  const renameBookmark = (id: string, name: string) => {
    commitBms(
      bookmarks.map((b) =>
        b.id === id ? { ...b, name: name.slice(0, 60) || b.name } : b
      )
    );
  };

  const deleteBookmark = (id: string) => {
    commitBms(bookmarks.filter((b) => b.id !== id));
  };

  const bmView: BookmarkView[] = useMemo(
    () =>
      [...bookmarks]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((b) => ({
          id: b.id,
          name: b.name,
          sub: `第 ${b.page + 1} 页`,
        })),
    [bookmarks]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 书签命名/改名输入框聚焦时，方向键留给文本编辑，不翻页
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      // 书签抽屉打开时视为模态：方向键不翻页，
      // 否则书会在抽屉背后翻动，导致书签「默认名」与实际保存位置错位
      if (showBookmarks) return;
      if (e.key === "ArrowLeft") go(safePage - 1);
      if (e.key === "ArrowRight") go(safePage + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, safePage, showBookmarks]);

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
          <button
            type="button"
            onClick={() => setShowBookmarks((v) => !v)}
            className={
              "relative rounded-md px-2.5 py-1.5 text-sm transition-colors " +
              (showBookmarks ? "text-lamp-2" : "text-fog hover:text-paper")
            }
            title="书签"
          >
            书签
            {bookmarks.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 rounded-full bg-lamp px-1 font-mono text-[10px] leading-4 text-on-accent">
                {bookmarks.length}
              </span>
            )}
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
          if (dx > 48) go(safePage - 1);
          if (dx < -48) go(safePage + 1);
        }}
      >
        <article
          className="mx-auto max-w-2xl px-6 py-10 leading-[2] text-reader-text"
          style={{ fontSize }}
        >
          {error && <p className="text-fog">文件加载失败，请返回书架重试。</p>}
          {!error && content === null && <p className="text-fog">正在打开…</p>}
          {!error && content !== null && pages[safePage]}
        </article>
      </div>

      <footer className="flex h-13 shrink-0 items-center justify-between gap-3 border-t border-line/70 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => go(safePage - 1)}
          disabled={safePage <= 0}
          className="rounded-md border border-line/70 px-4 py-1.5 text-sm text-fog transition-colors hover:border-lamp/50 hover:text-paper disabled:opacity-40"
        >
          ← 上一页
        </button>
        <span className="font-mono text-xs text-fog">
          {content === null ? "加载中…" : `${safePage + 1} / ${pages.length} 页`}
        </span>
        <button
          type="button"
          onClick={() => go(safePage + 1)}
          disabled={content === null || safePage >= pages.length - 1}
          className="rounded-md border border-line/70 px-4 py-1.5 text-sm text-fog transition-colors hover:border-lamp/50 hover:text-paper disabled:opacity-40"
        >
          下一页 →
        </button>
      </footer>

      {/* 书签抽屉 */}
      <BookmarkPanel
        open={showBookmarks}
        onClose={() => setShowBookmarks(false)}
        items={bmView}
        canAdd={content !== null && pages.length > 0}
        defaultName={content === null ? "" : `第 ${safePage + 1} 页`}
        notice={bmNotice}
        highlightId={bmHighlight}
        onAdd={addBookmark}
        onJump={jumpBookmark}
        onRename={renameBookmark}
        onDelete={deleteBookmark}
      />
    </div>
  );
}
