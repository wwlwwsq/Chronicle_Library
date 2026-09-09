"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authFetch } from "@/lib/api-base";
import { Cover } from "@/components/Cover";

const PAGE_SIZE = 20;

type Comic = {
  id: number;
  title: string;
  author: string;
  category: string;
  coverPath: string | null;
  _count: { pages: number };
};

export default function ComicsClient() {
  const router = useRouter();
  const params = useSearchParams();
  const cat = params.get("cat") || "全部";
  const pageParam = Number(params.get("page")) || 1;

  const [comics, setComics] = useState<Comic[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    authFetch("/api/comics")
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.json();
      })
      .then((d) => alive && setComics(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set((comics || []).map((c) => c.category));
    return ["全部", ...Array.from(set).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))];
  }, [comics]);

  const filtered = useMemo(
    () => (comics || []).filter((c) => cat === "全部" || c.category === cat),
    [comics, cat]
  );
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, pageParam), totalPages);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const go = (p: number) => {
    const sp = new URLSearchParams();
    if (cat !== "全部") sp.set("cat", cat);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    router.push(qs ? `/comics?${qs}` : "/comics");
  };

  return (
    <div className="lamp-glow min-h-[calc(100vh-56px)]">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <header className="mb-8">
          <p className="mb-1 text-xs tracking-[0.3em] text-lamp">画匣</p>
          <h1 className="font-serif text-3xl">漫画 {total} 部</h1>
          <p className="mt-2 text-sm text-fog">
            单页翻着看，或切成卷轴一口气滑到底，看到哪部都记得住。
          </p>
        </header>

        {categories.length > 1 && (
          <nav className="mb-8 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c}
                href={c === "全部" ? "/comics" : `/comics?cat=${encodeURIComponent(c)}`}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  cat === c
                    ? "border-lamp/60 bg-lamp/10 text-lamp-2"
                    : "hairline text-fog hover:border-lamp/40 hover:text-paper"
                }`}
              >
                {c}
              </Link>
            ))}
          </nav>
        )}

        {failed ? (
          <div className="rounded-lg border border-dashed hairline px-6 py-16 text-center">
            <p className="text-fog">画匣暂时打不开，稍后再试试。</p>
          </div>
        ) : comics === null ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-ink-2/60" />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="rounded-lg border border-dashed hairline px-6 py-16 text-center">
            <p className="text-fog">
              画匣还空着。{" "}
              <Link href="/admin/comics" className="text-lamp-2 hover:underline">
                去后台上传第一部漫画 →
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {paged.map((c) => (
                <div key={c.id}>
                  <Cover
                    title={c.title}
                    coverPath={c.coverPath}
                    href={`/comics/${c.id}`}
                    className="aspect-[3/4]"
                  />
                  <p className="mt-2 truncate text-sm" title={c.title}>
                    {c.title}
                  </p>
                  <p className="truncate text-xs text-fog">
                    {c.author || "佚名"} · {c._count.pages} 页
                  </p>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="mt-12 flex items-center justify-center gap-5 text-sm">
                {page > 1 ? (
                  <button type="button" onClick={() => go(page - 1)} className="text-fog transition-colors hover:text-lamp-2">
                    ← 上一页
                  </button>
                ) : (
                  <span className="text-fog/40">← 上一页</span>
                )}
                <span className="font-mono text-xs text-fog">
                  {page} / {totalPages}
                </span>
                {page < totalPages ? (
                  <button type="button" onClick={() => go(page + 1)} className="text-fog transition-colors hover:text-lamp-2">
                    下一页 →
                  </button>
                ) : (
                  <span className="text-fog/40">下一页 →</span>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
