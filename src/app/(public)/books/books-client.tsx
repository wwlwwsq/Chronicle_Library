"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authFetch } from "@/lib/api-base";
import { Cover } from "@/components/Cover";
import { formatBytes } from "@/lib/site";

const PAGE_SIZE = 20;

type Book = {
  id: number;
  title: string;
  author: string;
  category: string;
  fileSize: number;
  coverPath: string | null;
};

export default function BooksClient() {
  const router = useRouter();
  const params = useSearchParams();
  const cat = params.get("cat") || "全部";
  const pageParam = Number(params.get("page")) || 1;

  const [books, setBooks] = useState<Book[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    authFetch("/api/books")
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.json();
      })
      .then((d) => alive && setBooks(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set((books || []).map((b) => b.category));
    return ["全部", ...Array.from(set).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))];
  }, [books]);

  const filtered = useMemo(
    () => (books || []).filter((b) => cat === "全部" || b.category === cat),
    [books, cat]
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
    router.push(qs ? `/books?${qs}` : "/books");
  };

  return (
    <div className="lamp-glow min-h-[calc(100vh-56px)]">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <header className="mb-8">
          <p className="mb-1 text-xs tracking-[0.3em] text-lamp">书架</p>
          <h1 className="font-serif text-3xl">藏书 {total} 本</h1>
          <p className="mt-2 text-sm text-fog">EPUB 与 TXT 都能直接在网页里读，进度会记在这台设备上。</p>
        </header>

        {categories.length > 1 && (
          <nav className="mb-8 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c}
                href={c === "全部" ? "/books" : `/books?cat=${encodeURIComponent(c)}`}
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
            <p className="text-fog">书架暂时打不开，稍后再试试。</p>
          </div>
        ) : books === null ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-ink-2/60" />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="rounded-lg border border-dashed hairline px-6 py-16 text-center">
            <p className="text-fog">
              {cat !== "全部" ? "这个格子里还没有书。" : "书架还空着。"}{" "}
              <Link href="/admin/books" className="text-lamp-2 hover:underline">
                去后台上传 →
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {paged.map((b) => (
                <div key={b.id}>
                  <Cover
                    title={b.title}
                    coverPath={b.coverPath}
                    href={`/books/${b.id}`}
                    className="aspect-[3/4]"
                  />
                  <p className="mt-2 truncate text-sm" title={b.title}>
                    {b.title}
                  </p>
                  <p className="truncate text-xs text-fog">
                    {b.author || "佚名"} · {b.category} · {formatBytes(b.fileSize)}
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
