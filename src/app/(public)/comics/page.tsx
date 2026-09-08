import Link from "next/link";
import { db } from "@/lib/db";
import { Cover } from "@/components/Cover";

export const dynamic = "force-dynamic";

export const metadata = { title: "画匣" };

export default async function ComicsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const comics = await db.comic.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { pages: true } } },
  });
  const categories = ["全部", ...Array.from(new Set(comics.map((c) => c.category)))];
  const filtered = !cat || cat === "全部" ? comics : comics.filter((c) => c.category === cat);

  return (
    <div className="lamp-glow min-h-[calc(100vh-56px)]">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <header className="mb-8">
          <p className="mb-1 text-xs tracking-[0.3em] text-lamp">画匣</p>
          <h1 className="font-serif text-3xl">漫画 {comics.length} 部</h1>
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
                  (cat || "全部") === c
                    ? "border-lamp/60 bg-lamp/10 text-lamp-2"
                    : "hairline text-fog hover:border-lamp/40 hover:text-paper"
                }`}
              >
                {c}
              </Link>
            ))}
          </nav>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed hairline px-6 py-16 text-center">
            <p className="text-fog">
              画匣还空着。{" "}
              <Link href="/admin/comics" className="text-lamp-2 hover:underline">
                去后台上传第一部漫画 →
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((c) => (
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
        )}
      </div>
    </div>
  );
}
