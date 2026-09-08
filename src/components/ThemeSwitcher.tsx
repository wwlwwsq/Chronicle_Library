"use client";

import { useEffect, useRef, useState } from "react";

export const THEMES = [
  { id: "night", name: "深夜书房", dots: ["#0c1521", "#e6a944", "#ece5d4"] },
  { id: "day", name: "暖纸日光", dots: ["#f4eee1", "#b5432a", "#332a1e"] },
  { id: "ink-wash", name: "水墨宣纸", dots: ["#edece7", "#3e5c73", "#1d1d1b"] },
  { id: "forest", name: "松间萤火", dots: ["#0e1913", "#a9c76b", "#e4e9d8"] },
  { id: "terminal", name: "苍绿终端", dots: ["#090e0b", "#3fd97e", "#c2ecd0"] },
];

export default function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("night");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(document.documentElement.getAttribute("data-theme") || "night");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (id: string) => {
    document.documentElement.setAttribute("data-theme", id);
    // 写 cookie 供服务端渲染下次直接出正确主题；localStorage 只做本页即时备份
    document.cookie = `mbw:theme=${id}; path=/; max-age=31536000; samesite=lax`;
    try {
      localStorage.setItem("mbw:theme", id);
    } catch {}
    setCurrent(id);
    setOpen(false);
  };

  const active = THEMES.find((t) => t.id === current) || THEMES[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="切换主题"
        title="切换主题"
        className="flex items-center gap-1.5 rounded-md border hairline px-2.5 py-1.5 text-sm text-fog transition-colors hover:border-lamp/50 hover:text-paper"
      >
        <span className="flex -space-x-1" aria-hidden>
          {active.dots.map((c) => (
            <span
              key={c}
              className="inline-block size-3 rounded-full border border-ink"
              style={{ background: c }}
            />
          ))}
        </span>
        {!compact && <span className="hidden sm:inline">{active.name}</span>}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-lg border hairline bg-ink-2 shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
        >
          <p className="border-b hairline px-3 py-2 text-xs text-fog">挑一个风格</p>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitem"
              onClick={() => pick(t.id)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-ink-3 ${
                t.id === current ? "text-lamp-2" : "text-paper"
              }`}
            >
              <span className="flex -space-x-1" aria-hidden>
                {t.dots.map((c) => (
                  <span
                    key={c}
                    className="inline-block size-3.5 rounded-full border border-line"
                    style={{ background: c }}
                  />
                ))}
              </span>
              {t.name}
              {t.id === current && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
