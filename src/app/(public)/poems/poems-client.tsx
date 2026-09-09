"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authFetch } from "@/lib/api-base";

/** 年代按朝代先后排列，未收录的朝代按出现顺序附在最后 */
const DYNASTY_ORDER = [
  "先秦",
  "汉魏",
  "南北朝",
  "隋",
  "唐",
  "五代",
  "宋",
  "元",
  "明",
  "清",
  "近现代",
];

type Poem = {
  id: number;
  title: string;
  author: string;
  dynasty: string;
  style: string;
  content: string;
};

function ordered(values: string[], canonical: string[]) {
  const set = Array.from(new Set(values));
  const head = canonical.filter((c) => set.includes(c));
  return [...head, ...set.filter((v) => !canonical.includes(v))];
}

export default function PoemsClient() {
  const router = useRouter();
  const params = useSearchParams();
  const dynasty = params.get("dynasty") || "";
  const style = params.get("style") || "";

  const [poems, setPoems] = useState<Poem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    authFetch("/api/poems")
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.json();
      })
      .then((d) => alive && setPoems(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const dynasties = useMemo(
    () => ordered((poems || []).map((p) => p.dynasty), DYNASTY_ORDER),
    [poems]
  );
  const styles = useMemo(
    () => ordered((poems || []).map((p) => p.style), []),
    [poems]
  );

  const filtered = useMemo(
    () =>
      (poems || []).filter(
        (p) => (!dynasty || p.dynasty === dynasty) && (!style || p.style === style)
      ),
    [poems, dynasty, style]
  );

  const chipHref = (key: "dynasty" | "style", value: string) => {
    const sp = new URLSearchParams();
    const merged = { dynasty, style, [key]: value };
    if (merged.dynasty && merged.dynasty !== "全部") sp.set("dynasty", merged.dynasty);
    if (merged.style && merged.style !== "全部") sp.set("style", merged.style);
    const qs = sp.toString();
    router.push(qs ? `/poems?${qs}` : "/poems");
  };

  return (
    <div className="lamp-glow min-h-[calc(100vh-56px)]">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <header className="mb-10 text-center">
          <p className="mb-2 text-xs tracking-[0.4em] text-lamp">诗 词</p>
          <h1 className="font-serif text-3xl tracking-wide">笺上得句 {(poems || []).length} 首</h1>
          <p className="mt-3 text-sm leading-6 text-fog">
            按年代与风格拾掇成册，偶得海报名画，也一并挂在这里。
          </p>
        </header>

        {/* 年代 · 风格 两个维度的筛选 */}
        <nav className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 font-serif text-sm text-fog/80">年代</span>
          {["全部", ...dynasties].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => chipHref("dynasty", d)}
              className={`rounded-full border px-3 py-1 text-xs tracking-wider transition-colors ${
                (dynasty || "全部") === d
                  ? "border-lamp/60 bg-lamp/10 text-lamp-2"
                  : "hairline text-fog hover:border-lamp/40 hover:text-paper"
              }`}
            >
              {d}
            </button>
          ))}
        </nav>
        <nav className="mb-10 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 font-serif text-sm text-fog/80">风格</span>
          {["全部", ...styles].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => chipHref("style", s)}
              className={`rounded-full border px-3 py-1 text-xs tracking-wider transition-colors ${
                (style || "全部") === s
                  ? "border-lamp/60 bg-lamp/10 text-lamp-2"
                  : "hairline text-fog hover:border-lamp/40 hover:text-paper"
              }`}
            >
              {s}
            </button>
          ))}
        </nav>

        {failed ? (
          <div className="rounded-lg border border-dashed hairline px-6 py-16 text-center">
            <p className="font-serif text-fog">诗笺暂时取不出来，稍后再试试。</p>
          </div>
        ) : poems === null ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-ink-2/60" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed hairline px-6 py-16 text-center">
            <p className="font-serif text-fog">
              这一格还没有诗句。{" "}
              <Link href="/admin/poems" className="text-lamp-2 hover:underline">
                去后台录一首 →
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((p) => {
              const firstLine = p.content.split("\n")[0]?.trim() || "";
              return (
                <Link
                  key={p.id}
                  href={`/poems/${p.id}`}
                  className="group relative overflow-hidden rounded-lg border hairline bg-ink-2/40 px-6 py-5 transition-all hover:-translate-y-0.5 hover:border-lamp/40 hover:bg-ink-2/70"
                >
                  {/* 左侧素雅竖线，hover 点亮 */}
                  <span
                    aria-hidden
                    className="absolute inset-y-4 left-0 w-px bg-line transition-colors group-hover:bg-lamp/60"
                  />
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="truncate font-serif text-lg tracking-wide group-hover:text-lamp-2">
                      {p.title}
                    </h2>
                    <span className="shrink-0 rounded-full border hairline px-2 py-0.5 text-[11px] text-fog">
                      {p.style}
                    </span>
                  </div>
                  <p className="mt-1 text-xs tracking-wide text-fog">
                    {p.dynasty} · {p.author || "佚名"}
                  </p>
                  <p className="mt-3 line-clamp-2 font-serif leading-7 text-paper/75">
                    「{firstLine}」
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
