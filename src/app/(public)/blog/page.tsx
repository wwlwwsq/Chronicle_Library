import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, parseTags } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = { title: "随笔" };

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const posts = await db.post.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true, summary: true, tags: true, createdAt: true },
  });
  const allTags = Array.from(new Set(posts.flatMap((p) => parseTags(p.tags))));
  const filtered = tag ? posts.filter((p) => parseTags(p.tags).includes(tag)) : posts;

  return (
    <div className="lamp-glow min-h-[calc(100vh-56px)]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header className="mb-8">
          <p className="mb-1 text-xs tracking-[0.3em] text-lamp">书桌</p>
          <h1 className="font-serif text-3xl">随笔 {posts.length} 篇</h1>
          <p className="mt-2 text-sm text-fog">想到什么写什么，写完就放在这儿。</p>
        </header>

        {allTags.length > 0 && (
          <nav className="mb-8 flex flex-wrap gap-2">
            <Link
              href="/blog"
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                !tag ? "border-lamp/60 bg-lamp/10 text-lamp-2" : "hairline text-fog hover:border-lamp/40"
              }`}
            >
              全部
            </Link>
            {allTags.map((t) => (
              <Link
                key={t}
                href={`/blog?tag=${encodeURIComponent(t)}`}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  tag === t
                    ? "border-lamp/60 bg-lamp/10 text-lamp-2"
                    : "hairline text-fog hover:border-lamp/40 hover:text-paper"
                }`}
              >
                {t}
              </Link>
            ))}
          </nav>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed hairline px-6 py-16 text-center">
            <p className="text-fog">
              还没有随笔。{" "}
              <Link href="/admin/posts" className="text-lamp-2 hover:underline">
                去后台写第一篇 →
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((p) => (
              <article key={p.id} className="rounded-lg border hairline bg-ink-2/60 p-5 transition-colors hover:border-lamp/30">
                <time className="font-mono text-xs text-fog">{formatDate(p.createdAt)}</time>
                <h2 className="mt-1.5 font-serif text-xl leading-snug">
                  <Link href={`/blog/${p.slug}`} className="transition-colors hover:text-lamp-2">
                    {p.title}
                  </Link>
                </h2>
                {p.summary && <p className="mt-2 text-sm leading-6 text-fog">{p.summary}</p>}
                {p.tags && (
                  <p className="mt-3 flex flex-wrap gap-2">
                    {parseTags(p.tags).map((t) => (
                      <span key={t} className="rounded-full bg-ink-3 px-2.5 py-0.5 text-xs text-fog">
                        {t}
                      </span>
                    ))}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
