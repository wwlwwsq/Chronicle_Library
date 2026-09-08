"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, btnGhost } from "./ui";
import { formatDate, parseTags } from "@/lib/site";

type PostItem = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  tags: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function AdminPosts() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      setPosts(await api<PostItem[]>("/api/posts?all=1"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (p: PostItem) => {
    if (!window.confirm(`确定删除随笔《${p.title}》吗？`)) return;
    await api(`/api/posts/${p.id}`, { method: "DELETE" });
    setMessage("已删除。");
    await load();
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl">随笔管理</h1>
          <p className="mt-1 text-sm text-fog">用 Markdown 写，写完可存草稿慢慢改。</p>
        </div>
        <Link href="/admin/posts/new" className="rounded-md bg-lamp px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lamp-2">
          写新随笔
        </Link>
      </div>

      {message && <p className="mt-4 rounded-md border border-moss/30 bg-moss/10 px-3 py-2 text-sm text-moss">{message}</p>}

      <h2 className="mb-3 mt-8 font-serif text-lg">全部（{posts.length}）</h2>
      {loading ? (
        <p className="text-sm text-fog">加载中…</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-fog">一篇都还没有，从第一句开始。</p>
      ) : (
        <ul className="divide-y hairline overflow-hidden rounded-lg border hairline">
          {posts.map((p) => (
            <li key={p.id} className="flex items-center gap-4 bg-ink-2/40 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {p.title}
                  {!p.published && (
                    <span className="ml-2 rounded-full bg-ink-3 px-2 py-0.5 text-xs text-fog">草稿</span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-xs text-fog">
                  {formatDate(p.updatedAt)}
                  {parseTags(p.tags).length > 0 && ` · ${parseTags(p.tags).join(" / ")}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href={`/blog/${p.slug}`} className={btnGhost} target="_blank">预览</Link>
                <Link href={`/admin/posts/${p.id}`} className={btnGhost}>编辑</Link>
                <button type="button" onClick={() => remove(p)}
                  className="rounded-md border border-red-400/30 px-3 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-400/10">
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
