import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = { title: "后台" };

export default async function AdminHomePage() {
  const [bookCount, comicCount, postCount, games, books, posts] = await Promise.all([
    db.book.count(),
    db.comic.count(),
    db.post.count(),
    db.game.count(),
    db.book.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    db.post.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }),
  ]);

  const cards = [
    { label: "图书", href: "/admin/books" },
    { label: "漫画", href: "/admin/comics" },
    { label: "随笔", href: "/admin/posts" },
    { label: "游戏", href: "/admin/games" },
  ];
  const counts = [bookCount, comicCount, postCount, games];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-2xl">书房盘点</h1>
      <p className="mt-1 text-sm text-fog">灯亮着，随时可以整理。</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c, i) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-lg border hairline bg-ink-2/60 p-5 transition-colors hover:border-lamp/40"
          >
            <p className="font-mono text-3xl">{counts[i]}</p>
            <p className="mt-1 text-sm text-fog">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-serif text-lg">最近上传的图书</h2>
          {books.length === 0 ? (
            <p className="text-sm text-fog">
              还没有书。{" "}
              <Link href="/admin/books" className="text-lamp-2 hover:underline">
                去上传 →
              </Link>
            </p>
          ) : (
            <ul className="divide-y hairline rounded-lg border hairline bg-ink-2/40 text-sm">
              {books.map((b) => (
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
          {posts.length === 0 ? (
            <p className="text-sm text-fog">
              一篇都还没写。{" "}
              <Link href="/admin/posts/new" className="text-lamp-2 hover:underline">
                开始写 →
              </Link>
            </p>
          ) : (
            <ul className="divide-y hairline rounded-lg border hairline bg-ink-2/40 text-sm">
              {posts.map((p) => (
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
