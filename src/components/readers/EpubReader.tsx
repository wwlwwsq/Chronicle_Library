"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type TocItem = { label: string; href: string; depth: number; spineIndex: number };

/**
 * 目录树扁平化：很多 EPUB（如 epubBuilder/calibre 制作）把章节挂在
 * 「卷」或「书名」navPoint 的 subitems 下，若只取顶层会导致目录缺章。
 * 这里递归展开所有层级，depth 用于渲染缩进。
 * spineIndex 先置 -1，加载目录后由 spine 预解析回填。
 */
function flattenToc(items: any[] | undefined, depth = 0): TocItem[] {
  return (items || []).flatMap((t) => [
    {
      label: t.label?.trim() || "未命名章节",
      href: t.href,
      depth,
      spineIndex: -1,
    },
    ...flattenToc(t.subitems, depth + 1),
  ]);
}

/* eslint-disable @typescript-eslint/no-explicit-any */

type ReadMode = "paged" | "scroll";
const MODE_KEY = "mbw:reader-mode"; // 全局偏好：跨书保持同一阅读习惯

export default function EpubReader({
  bookId,
  title,
  filePath,
}: {
  bookId: number;
  title: string;
  filePath: string;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const locationsReadyRef = useRef(false);
  const tocListRef = useRef<HTMLUListElement>(null);
  const activeTocIdxRef = useRef(-1);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [progress, setProgress] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [curIndex, setCurIndex] = useState(-1);
  const [spineLen, setSpineLen] = useState(0);
  // SSR 期间先按翻页渲染，挂载后从本地存储恢复偏好（避免水合不一致）
  const [mode, setMode] = useState<ReadMode>("paged");
  const storageKey = `mbw:book:${bookId}`;

  useEffect(() => {
    if (localStorage.getItem(MODE_KEY) === "scroll") setMode("scroll");
  }, []);

  useEffect(() => {
    let cancelled = false;
    let rendition: any;
    let book: any;

    // 用显式像素尺寸渲染，避免 epub.js 以 100% 计算栏宽时贴边/溢出
    const size = () => ({
      w: areaRef.current?.clientWidth || window.innerWidth,
      h: areaRef.current?.clientHeight || window.innerHeight,
    });

    const opening = (async () => {
      const ePub = (await import("epubjs")).default;
      const JSZip = (await import("jszip")).default;
      // StrictMode 下 effect 会先卸载再重挂，若在动态 import 期间已取消，
      // 必须在此退出，否则会创建出无人销毁的"僵尸"渲染实例
      // （表现为屏幕上残留一个不响应目录/翻页的阅读区）
      if (cancelled) return;

      // epubjs 的 book.opened 只有 resolve 没有 reject：文件损坏时它永远
      // pending，阅读器只会卡在"正在打开…"。所以先自己取文件并用 JSZip
      // 校验，拿到明确的失败原因；校验通过后把二进制直接交给 epubjs，
      // 也省去它内部再发一次请求。
      const resp = await fetch(`/api/files/${filePath}`);
      if (!resp.ok) throw new Error("文件下载失败");
      const data = await resp.arrayBuffer();
      await JSZip.loadAsync(data);
      if (cancelled) return;

      book = ePub(data, { openAs: "binary" });
      // 大文件（几百章的书）解析需要数秒：必须等解析完成再渲染，
      // 否则 rendition 内部读 book.package 时它是 undefined，
      // 间歇性抛 "Cannot read properties of undefined (reading 'package')"
      await Promise.race([
        book.opened,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("EPUB 打开超时")), 30_000)
        ),
      ]);
      if (cancelled) return;
      const { w, h } = size();
      rendition = book.renderTo(areaRef.current!, {
        width: w,
        height: h,
        spread: "none",
        // 滚动模式：continuous 管理器按需加载上下章节，垂直无限滚动
        ...(mode === "scroll"
          ? { manager: "continuous", flow: "scrolled-continuous" }
          : {}),
      });
      renditionRef.current = rendition;

      // epub.js 的内部任务队列用 requestAnimationFrame 驱动，而浏览器在标签页
      // 不可见时会冻结 rAF：队列停摆，书卡在"正在打开…"；等切回前台 rAF 恢复时，
      // 积压的任务又可能跑到已被销毁的渲染实例上（reading 'package' 报错的根源）。
      // 换成隐藏时也能推进的 tick，并踢一次队列让积压任务立即排空。
      (rendition as any).q.tick = (cb: (t: number) => void) =>
        document.hidden
          ? (window.setTimeout(() => cb(performance.now()), 40) as unknown as number)
          : requestAnimationFrame(cb);
      (rendition as any).q.run();

      // 从当前主题令牌读取配色，注入 epub.js 的 iframe
      const css = getComputedStyle(document.documentElement);
      const v = (name: string, fallback: string) =>
        css.getPropertyValue(name).trim() || fallback;
      rendition.themes.register("site", {
        body: {
          background: `${v("--reader-bg", "#101b29")} !important`,
          color: v("--reader-text", "#ccd6e0"),
          padding:
            mode === "scroll" ? "12px 48px !important" : "0 48px !important",
        },
        a: { color: v("--lamp-2", "#f2c179") },
        p: { "line-height": "1.9" },
        "h1, h2, h3": { color: v("--paper", "#ece5d4") },
      });
      rendition.themes.select("site");
      rendition.themes.fontSize("100%");

      rendition.on("relocated", (loc: any) => {
        if (loc?.start?.cfi) localStorage.setItem(storageKey, loc.start.cfi);
        if (typeof loc?.start?.index === "number") {
          setCurIndex(loc.start.index);
        }
        setSpineLen(book?.spine?.length ?? 0);
        let pct: number | undefined = loc?.start?.percentage;
        // epub.js 在位置索引未生成时 percentage 恒为 0，
        // 此时退回用章节序号估算：第 idx/len 本，瞬时可得、随翻页单调递增
        if (typeof pct !== "number" || (!locationsReadyRef.current && pct === 0)) {
          const idx = loc?.start?.index;
          const len = book?.spine?.length ?? 0;
          if (typeof idx === "number" && len > 0) {
            pct = loc?.atEnd ? 1 : Math.min(1, Math.max(0, idx / len));
          }
        }
        if (typeof pct === "number") {
          setProgress(Math.round(pct * 100));
        }
      });

      const saved = localStorage.getItem(storageKey);
      try {
        await rendition.display(saved || undefined);
      } catch {
        // 书籍文件被替换后旧进度 CFI 可能失效，回退到开头
        localStorage.removeItem(storageKey);
        await rendition.display();
      }
      if (cancelled) return;

      const nav = await book.loaded.navigation;
      if (!cancelled) {
        // 预解析每个目录项对应的 spine 序号：
        // 用于「打开目录自动定位当前章节」与当前章高亮
        setToc(
          flattenToc(nav?.toc).map((it) => {
            const sec = it.href ? book.spine.get(it.href) : null;
            return { ...it, spineIndex: sec ? sec.index : -1 };
          })
        );
        setReady(true);
      }

      // 后台生成位置索引，供进度百分比使用。
      // 超大书（如 1000+ 章）跳过：逐章生成耗时数分钟且占内存，
      // 进度直接沿用上面的章节序号估算
      try {
        await book.ready;
        if (book.spine.length <= 400) {
          await book.locations.generate(1200);
          locationsReadyRef.current = true;
        }
      } catch {
        // 生成失败不影响阅读
      }
    })();

    // 打开失败（文件损坏/被加密/非标准 EPUB/渲染出错）：
    // 统一进入失败态，避免未处理的 rejection 弹错误面板、页面卡在"正在打开…"
    opening.catch(() => {
      if (!cancelled) setFailed(true);
    });

    const onResize = () => {
      const s = size();
      renditionRef.current?.resize(s.w, s.h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      try {
        rendition?.destroy();
      } catch {}
      try {
        book?.destroy();
      } catch {}
    };
  }, [filePath, storageKey, mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") renditionRef.current?.prev();
      if (e.key === "ArrowRight") renditionRef.current?.next();
      // 滚动模式下方向键即滚动一屏
      if (mode === "scroll") {
        if (e.key === "ArrowDown") renditionRef.current?.next();
        if (e.key === "ArrowUp") renditionRef.current?.prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  const toggleMode = () => {
    setMode((m) => {
      const next: ReadMode = m === "paged" ? "scroll" : "paged";
      localStorage.setItem(MODE_KEY, next);
      return next;
    });
  };

  useEffect(() => {
    renditionRef.current?.themes.fontSize(`${fontSize}%`);
  }, [fontSize]);

  // 当前章节对应的目录项：目录顺序与阅读顺序一致，
  // 取 spine 位置在当前阅读位置之前（含）的最后一个条目——
  // 卷首页、未单独收录目录的过渡页会自然归到最近的上一章
  const activeTocIdx = useMemo(() => {
    let best = -1;
    for (let i = 0; i < toc.length; i++) {
      const si = toc[i].spineIndex;
      if (si >= 0 && si <= curIndex) best = i;
    }
    return best;
  }, [toc, curIndex]);

  useEffect(() => {
    activeTocIdxRef.current = activeTocIdx;
  }, [activeTocIdx]);

  // 打开目录时自动滚动到当前正在读的章节
  useEffect(() => {
    if (!showToc) return;
    const raf = requestAnimationFrame(() => {
      tocListRef.current
        ?.querySelector<HTMLElement>(`[data-toc-i="${activeTocIdxRef.current}"]`)
        ?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(raf);
  }, [showToc]);

  const touchX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx > 48) renditionRef.current?.prev();
    if (dx < -48) renditionRef.current?.next();
  };

  const jump = async (href: string) => {
    await renditionRef.current?.display(href);
    setShowToc(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-reader-bg">
      {/* 顶栏 */}
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
            onClick={() => setFontSize((s) => Math.max(70, s - 10))}
            className="rounded-md px-2 py-1.5 text-sm text-fog hover:text-paper"
            aria-label="缩小字号"
          >
            A-
          </button>
          <button
            type="button"
            onClick={() => setFontSize((s) => Math.min(180, s + 10))}
            className="rounded-md px-2 py-1.5 text-sm text-fog hover:text-paper"
            aria-label="放大字号"
          >
            A+
          </button>
          <button
            type="button"
            onClick={toggleMode}
            className="rounded-md px-2.5 py-1.5 text-sm text-fog hover:text-paper"
            title={mode === "paged" ? "切换为上下滚动阅读" : "切换为左右翻页阅读"}
          >
            {mode === "paged" ? "滚动" : "翻页"}
          </button>
          <button
            type="button"
            onClick={() => setShowToc(true)}
            className="rounded-md px-2.5 py-1.5 text-sm text-fog hover:text-paper"
          >
            目录
          </button>
        </div>
      </header>

      {/* 正文 */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={areaRef}
          className="absolute inset-0"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        />
        {failed && (
          <div className="absolute inset-0 z-20 flex items-center justify-center px-6">
            <div className="flex max-w-md flex-col items-center gap-3 rounded-xl border hairline bg-ink-2/95 px-8 py-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
              <p className="font-serif text-xl">这本书打不开</p>
              <p className="text-sm leading-6 text-fog">
                文件可能已损坏、被加密，或不是标准 EPUB。
                可以删掉后重新导出一份再上传，或换 TXT 格式试试。
              </p>
              <Link
                href="/books"
                className="mt-1 rounded-md bg-lamp px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lamp-2"
              >
                返回书架
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 底栏 */}
      <footer className="flex h-13 shrink-0 items-center justify-between border-t border-line/70 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => renditionRef.current?.prev()}
          className="rounded-md border border-line/70 px-4 py-1.5 text-sm text-fog transition-colors hover:border-lamp/50 hover:text-paper"
        >
          ← 上一页
        </button>
        <span className="font-mono text-xs text-fog">
          {failed
            ? "打开失败"
            : ready
              ? spineLen > 400 && curIndex >= 0
                ? // 超大书章节粒度过粗（每章≈0.08%），百分比几乎不动，
                  // 用章节计数代替：跨章必变，位置语义也更直观
                  `第 ${curIndex + 1} / ${spineLen} 章`
                : progress === null
                  ? "阅读中"
                  : `已读 ${progress}%`
              : "正在打开…"}
        </span>
        <button
          type="button"
          onClick={() => renditionRef.current?.next()}
          className="rounded-md border border-line/70 px-4 py-1.5 text-sm text-fog transition-colors hover:border-lamp/50 hover:text-paper"
        >
          下一页 →
        </button>
      </footer>

      {/* 目录抽屉 */}
      {showToc && (
        <div className="absolute inset-0 z-10" onClick={() => setShowToc(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <nav
            className="no-scrollbar absolute inset-y-0 left-0 w-72 max-w-[80vw] overflow-y-auto border-r border-line bg-ink-2 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-serif text-lg">目录</p>
              <button
                type="button"
                onClick={() => setShowToc(false)}
                className="rounded-md px-2 py-1 text-sm text-fog hover:text-paper"
              >
                关闭
              </button>
            </div>
            {toc.length === 0 && <p className="text-sm text-fog">这本书没有目录信息。</p>}
            <ul ref={tocListRef} className="space-y-0.5">
              {toc.map((item, i) => {
                const active = i === activeTocIdx;
                return (
                  <li key={`${item.href}-${i}`}>
                    <button
                      type="button"
                      data-toc-i={i}
                      onClick={() => jump(item.href)}
                      className={`block w-full truncate rounded-md py-2 pr-3 text-left text-sm transition-colors ${
                        active
                          ? "bg-ink-3/70 text-lamp-2"
                          : "text-paper/85 hover:bg-ink-3 hover:text-lamp-2"
                      }`}
                      style={{ paddingLeft: `${12 + item.depth * 16}px` }}
                      title={item.label}
                    >
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
