"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type ComicPageItem = { id: number; pageIndex: number; path: string };

export default function ComicReader({
  comicId,
  title,
  pages,
}: {
  comicId: number;
  title: string;
  pages: ComicPageItem[];
}) {
  const [mode, setMode] = useState<"page" | "scroll">("page");
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const progressKey = `mbw:comic:${comicId}`;
  const modeKey = `mbw:comic-mode:${comicId}`;
  const scrollLock = useRef(true);

  // 初始化：恢复阅读模式与进度
  useEffect(() => {
    // localStorage 仅客户端存在，SSR 无法在 useState 初始化器中读取，只能挂载后恢复
    const savedMode = localStorage.getItem(modeKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时从 localStorage 恢复阅读模式
    if (savedMode === "page" || savedMode === "scroll") setMode(savedMode);
    const saved = Number(localStorage.getItem(progressKey));
    if (Number.isFinite(saved) && saved > 0 && saved < pages.length) {
      setIndex(saved);
    }
    scrollLock.current = false;
  }, [modeKey, progressKey, pages.length]);

  useEffect(() => {
    localStorage.setItem(modeKey, mode);
  }, [mode, modeKey]);

  const go = useCallback(
    (next: number) => {
      setIndex(Math.min(Math.max(0, next), pages.length - 1));
    },
    [pages.length]
  );

  // 进度持久化（单页模式）
  useEffect(() => {
    if (mode === "page") localStorage.setItem(progressKey, String(index));
  }, [index, mode, progressKey]);

  // 键盘翻页
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (mode !== "page") return;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(index - 1);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, mode]);

  // 卷轴模式：记录滚动进度
  const saveScroll = useCallback(() => {
    if (mode !== "scroll" || scrollLock.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const ratio = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
    localStorage.setItem(progressKey, ratio.toFixed(4));
    // 更新当前页码指示
    const viewportMid = el.scrollTop + el.clientHeight / 2;
    let cur = 0;
    imgRefs.current.forEach((img, i) => {
      if (img && img.offsetTop <= viewportMid) cur = i;
    });
    setIndex(cur);
  }, [mode, progressKey]);

  // 卷轴模式：恢复进度
  useEffect(() => {
    if (mode !== "scroll") return;
    const el = scrollRef.current;
    if (!el) return;
    const savedRatio = Number(localStorage.getItem(progressKey));
    if (Number.isFinite(savedRatio) && savedRatio > 0) {
      requestAnimationFrame(() => {
        el.scrollTop = savedRatio * (el.scrollHeight - el.clientHeight);
      });
    }
  }, [mode, progressKey]);

  const touchX = useRef(0);
  const touchY = useRef(0);

  const total = pages.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-reader-bg">
      <header className="flex h-13 shrink-0 items-center gap-2 border-b border-line/70 px-3 sm:px-5">
        <Link
          href="/comics"
          className="rounded-md px-2.5 py-1.5 text-sm text-fog transition-colors hover:text-paper"
        >
          ← 画匣
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center font-serif text-sm sm:text-base">
          {title}
        </h1>
        <button
          type="button"
          onClick={() => setMode(mode === "page" ? "scroll" : "page")}
          className="rounded-md border border-line/70 px-3 py-1.5 text-xs text-fog transition-colors hover:border-lamp/50 hover:text-paper sm:text-sm"
        >
          {mode === "page" ? "切到卷轴模式" : "切到单页模式"}
        </button>
      </header>

      {mode === "page" ? (
        <div
          className="relative flex-1 select-none overflow-hidden"
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
            touchY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX.current;
            const dy = e.changedTouches[0].clientY - touchY.current;
            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
              go(dx > 0 ? index - 1 : index + 1);
            }
          }}
        >
          {pages[index] && (
            <img
              key={pages[index].id}
              src={`/api/files/${pages[index].path}`}
              alt={`${title} 第 ${index + 1} 页`}
              className="mx-auto h-full w-auto max-w-full object-contain"
              draggable={false}
            />
          )}
          {/* 左右点击区 */}
          <button
            type="button"
            aria-label="上一页"
            onClick={() => go(index - 1)}
            className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize"
          />
          <button
            type="button"
            aria-label="下一页"
            onClick={() => go(index + 1)}
            className="absolute inset-y-0 right-0 w-1/3 cursor-e-resize"
          />
          {total > 1 && (
            <input
              type="range"
              min={0}
              max={total - 1}
              value={index}
              onChange={(e) => go(Number(e.target.value))}
              className="absolute inset-x-6 bottom-4 accent-lamp"
              aria-label="跳页"
            />
          )}
          {/* 预加载下一页 */}
          {pages[index + 1] && (
            <img
              src={`/api/files/${pages[index + 1].path}`}
              alt=""
              className="hidden"
              aria-hidden
            />
          )}
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={saveScroll}
          className="no-scrollbar relative flex-1 overflow-y-auto"
        >
          <div className="mx-auto max-w-3xl">
            {pages.map((p, i) => (
              <img
                key={p.id}
                ref={(el) => {
                  imgRefs.current[i] = el;
                }}
                src={`/api/files/${p.path}`}
                alt={`${title} 第 ${i + 1} 页`}
                loading={i < 2 ? "eager" : "lazy"}
                className="block w-full"
                draggable={false}
              />
            ))}
            <p className="py-10 text-center text-sm text-fog">已经到底啦 ·{" "}
              <Link href="/comics" className="text-lamp-2 hover:underline">
                回画匣
              </Link>
            </p>
          </div>
        </div>
      )}

      <footer className="flex h-11 shrink-0 items-center justify-between border-t border-line/70 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={mode !== "page" || index <= 0}
          className="rounded-md border border-line/70 px-3.5 py-1 text-sm text-fog transition-colors hover:border-lamp/50 hover:text-paper disabled:opacity-40"
        >
          ← 上一页
        </button>
        <span className="font-mono text-xs text-fog">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={mode !== "page" || index >= total - 1}
          className="rounded-md border border-line/70 px-3.5 py-1 text-sm text-fog transition-colors hover:border-lamp/50 hover:text-paper disabled:opacity-40"
        >
          下一页 →
        </button>
      </footer>
    </div>
  );
}
