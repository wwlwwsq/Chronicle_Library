import Link from "next/link";
import { db } from "@/lib/db";
import { Cover } from "@/components/Cover";
import { formatBytes } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = { title: "书架" };

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const books = await db.book.findMany({ orderBy: { createdAt: "desc" } });
  const categories = ["全部", ...Array.from(new Set(books.map((b) => b.category)))];
  const filtered = !cat || cat === "全部" ? books : books.filter((b) => b.category === cat);

  return (
    <div className="lamp-glow min-h-[calc(100vh-56px)]">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <header className="mb-8">
          <p className="mb-1 text-xs tracking-[0.3em] text-lamp">书架</p>
          <h1 className="font-serif text-3xl">藏书 {books.length} 本</h1>
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

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed hairline px-6 py-16 text-center">
            <p className="text-fog">
              这个格子里还没有书。{" "}
              <Link href="/admin/books" className="text-lamp-2 hover:underline">
                去后台上传 →
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((b) => (
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
        )}
      </div>
    </div>
  );
}
