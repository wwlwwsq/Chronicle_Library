import Link from "next/link";
import { db } from "@/lib/db";
import { Cover } from "@/components/Cover";
import { formatBytes } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = { title: "书架" };

const PAGE_SIZE = 20;

function pageNum(v: string | undefined) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 1;
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; page?: string }>;
}) {
  const { cat, page: pageParam } = await searchParams;
  const where = cat && cat !== "全部" ? { category: cat } : undefined;
  const total = await db.book.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageNum(pageParam), totalPages);

  const [books, grouped] = await Promise.all([
    db.book.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.book.groupBy({ by: ["category"] }),
  ]);
  const categories = [
    "全部",
    ...grouped
      .map((g) => g.category)
      .sort((a, b) => a.localeCompare(b, "zh-Hans-CN")),
  ];

  const pageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (cat && cat !== "全部") params.set("cat", cat);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/books?${qs}` : "/books";
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

        {total === 0 ? (
          <div className="rounded-lg border border-dashed hairline px-6 py-16 text-center">
            <p className="text-fog">
              {cat && cat !== "全部"
                ? "这个格子里还没有书。"
                : "书架还空着。"}{" "}
              <Link href="/admin/books" className="text-lamp-2 hover:underline">
                去后台上传 →
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {books.map((b) => (
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
                  <Link
                    href={pageUrl(page - 1)}
                    className="text-fog transition-colors hover:text-lamp-2"
                  >
                    ← 上一页
                  </Link>
                ) : (
                  <span className="text-fog/40">← 上一页</span>
                )}
                <span className="font-mono text-xs text-fog">
                  {page} / {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={pageUrl(page + 1)}
                    className="text-fog transition-colors hover:text-lamp-2"
                  >
                    下一页 →
                  </Link>
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
