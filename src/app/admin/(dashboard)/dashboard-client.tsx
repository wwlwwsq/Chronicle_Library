"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/components/admin/ui";
import { formatDate } from "@/lib/site";

type Stats = {
  counts: { books: number; comics: number; posts: number; games: number; poems: number };
  recentBooks: { id: number; title: string; createdAt: string }[];
  recentPosts: { id: number; title: string; published: boolean; updatedAt: string }[];
};

export default function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api<Stats>("/api/stats")
      .then((d) => alive && setStats(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-2xl">书房盘点</h1>
        <p className="mt-4 text-sm text-fog">盘点数据暂时取不到，稍后再试试。</p>
      </div>
    );
  }

  const cards = [
    { label: "图书", href: "/admin/books", n: stats?.counts.books },
    { label: "漫画", href: "/admin/comics", n: stats?.counts.comics },
    { label: "诗词", href: "/admin/poems", n: stats?.counts.poems },
    { label: "随笔", href: "/admin/posts", n: stats?.counts.posts },
    { label: "游戏", href: "/admin/games", n: stats?.counts.games },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-2xl">书房盘点</h1>
      <p className="mt-1 text-sm text-fog">灯亮着，随时可以整理。</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-lg border hairline bg-ink-2/60 p-5 transition-colors hover:border-lamp/40"
          >
            <p className="font-mono text-3xl">{c.n ?? "—"}</p>
            <p className="mt-1 text-sm text-fog">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-serif text-lg">最近上传的图书</h2>
          {!stats || stats.recentBooks.length === 0 ? (
            <p className="text-sm text-fog">
              还没有书。{" "}
              <Link href="/admin/books" className="text-lamp-2 hover:underline">
                去上传 →
              </Link>
            </p>
          ) : (
            <ul className="divide-y hairline rounded-lg border hairline bg-ink-2/40 text-sm">
              {stats.recentBooks.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="truncate">{b.title}</span>
                  <span className="shrink-0 font-mono text-xs text-fog">
                    {formatDate(b.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-serif text-lg">最近编辑的随笔</h2>
          {!stats || stats.recentPosts.length === 0 ? (
            <p className="text-sm text-fog">
              一篇都还没写。{" "}
              <Link href="/admin/posts/new" className="text-lamp-2 hover:underline">
                开始写 →
              </Link>
            </p>
          ) : (
            <ul className="divide-y hairline rounded-lg border hairline bg-ink-2/40 text-sm">
              {stats.recentPosts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <Link href={`/admin/posts/${p.id}`} className="truncate hover:text-lamp-2">
                    {p.title}
                  </Link>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      p.published ? "bg-moss/15 text-moss" : "bg-ink-3 text-fog"
                    }`}
                  >
                    {p.published ? "已发布" : "草稿"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
