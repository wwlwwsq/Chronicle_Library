import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/site";
import { Cover } from "@/components/Cover";

export const dynamic = "force-dynamic";

function hashStr(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

const CLOTH = ["#31465e", "#493a54", "#54423a", "#2f4a44", "#5a4632", "#3a3f5c"];

function Spine({
  title,
  id,
}: {
  title: string;
  id: number;
}) {
  const h = hashStr(title);
  const color = CLOTH[h % CLOTH.length];
  const height = 148 + (h % 52);
  return (
    <Link
      href={`/books/${id}`}
      className="group relative flex w-11 shrink-0 flex-col justify-start rounded-t-[3px] px-1 pt-3 transition-transform hover:-translate-y-1 sm:w-13"
      style={{ height, background: `linear-gradient(180deg, ${color}, ${color}cc)` }}
    >
      <span
        aria-hidden
        className="absolute inset-x-1 top-0 h-px bg-paper/25"
      />
      <span className="spine-text mx-auto font-serif text-[13px] text-paper/90 line-clamp-4">
        {title}
      </span>
    </Link>
  );
}

function GhostSpine({ label }: { label: string }) {
  return (
    <div className="flex w-11 shrink-0 flex-col items-center justify-start rounded-t-[3px] border border-dashed border-line px-1 pt-3 sm:w-13" style={{ height: 168 }}>
      <span className="spine-text font-serif text-[13px] text-fog/70 line-clamp-4">
        {label}
      </span>
    </div>
  );
}

function SectionHead({ eyebrow, title, more }: { eyebrow: string; title: string; more?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="mb-1 text-xs tracking-[0.3em] text-lamp">{eyebrow}</p>
        <h2 className="font-serif text-2xl">{title}</h2>
      </div>
      {more && (
        <Link href={more} className="shrink-0 text-sm text-fog transition-colors hover:text-lamp-2">
          更多 →
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [bookCount, comicCount, postCount, gameCount, poemCount] = await Promise.all([
    db.book.count(),
    db.comic.count(),
    db.post.count({ where: { published: true } }),
    db.game.count(),
    db.poem.count(),
  ]);
  const [books, comics, posts, games, poems] = await Promise.all([
    db.book.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.comic.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { _count: { select: { pages: true } } },
    }),
    db.post.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 4 }),
    db.game.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 6 }),
    db.poem.findMany({ orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  const stats = [
    { n: bookCount, label: "本藏书" },
    { n: comicCount, label: "部漫画" },
    { n: poemCount, label: "首诗词" },
    { n: postCount, label: "篇随笔" },
    { n: gameCount, label: "个游戏" },
  ];

  return (
    <div>
      {/* 灯下的开场 */}
      <section className="lamp-glow border-b hairline">
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24">
          <p className="mb-4 text-xs tracking-[0.35em] text-lamp">拾 光 书 房</p>
          <h1 className="max-w-2xl font-serif text-4xl leading-snug sm:text-5xl sm:leading-snug">
            夜里有一间书房，
            <br />
            <span className="text-lamp-2">灯还亮着。</span>
          </h1>
          <p className="mt-5 max-w-xl leading-7 text-fog">
            书架、画匣、游戏角和一张书桌都在这里。挑一本藏书读到困，翻几话漫画笑出声，
            玩一局小游戏歇歇手，再顺手写点什么。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/books"
              className="rounded-md bg-lamp px-5 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-lamp-2"
            >
              进书架看看
            </Link>
            <Link
              href="/blog"
              className="rounded-md border hairline px-5 py-2.5 text-sm text-paper transition-colors hover:border-lamp/50 hover:text-lamp-2"
            >
              读读随笔
            </Link>
          </div>
          <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-3">
            {stats.map((s) => (
              <div key={s.label} className="flex items-baseline gap-2">
                <dt className="order-2 text-sm text-fog">{s.label}</dt>
                <dd className="order-1 font-mono text-2xl text-paper">{s.n}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-16 px-4 py-14 sm:px-6">
        {/* 书架：最新上架 */}
        <section>
          <SectionHead eyebrow="书架" title="最近上架" more="/books" />
          {books.length > 0 ? (
            <div className="relative pt-4">
              <div className="no-scrollbar flex items-end gap-2.5 overflow-x-auto pb-3 sm:gap-3">
                {books.map((b) => (
                  <Spine key={b.id} title={b.title} id={b.id} />
                ))}
              </div>
              {/* 层板 */}
              <div className="h-2 rounded-b bg-gradient-to-b from-ink-3 to-ink-2 shadow-[0_10px_24px_rgba(0,0,0,0.45)]" />
            </div>
          ) : (
            <div className="pt-4">
              <div className="flex items-end gap-2.5 pb-3 sm:gap-3">
                {["第一本", "第二本", "第三本", "第四本", "第五本"].map((label) => (
                  <GhostSpine key={label} label={label} />
                ))}
              </div>
              <div className="h-2 rounded-b bg-gradient-to-b from-ink-3 to-ink-2" />
              <p className="mt-6 text-sm text-fog">
                书架还空着。{" "}
                <Link href="/admin/books" className="text-lamp-2 hover:underline">
                  从后台上传第一本书 →
                </Link>
              </p>
            </div>
          )}
        </section>

        {/* 画匣 */}
        {comics.length > 0 && (
          <section>
            <SectionHead eyebrow="画匣" title="漫画更新" more="/comics" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {comics.map((c) => (
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
                  <p className="text-xs text-fog">{c._count.pages} 话 · {c.category}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 书桌：随笔 */}
        {posts.length > 0 && (
          <section>
            <SectionHead eyebrow="书桌" title="最近随笔" more="/blog" />
            <div className="divide-y hairline rounded-lg border hairline bg-ink-2/60">
              {posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/blog/${p.slug}`}
                  className="group flex items-baseline gap-4 px-5 py-4 transition-colors hover:bg-ink-3/60"
                >
                  <time className="shrink-0 font-mono text-xs text-fog">
                    {formatDate(p.createdAt)}
                  </time>
                  <span className="font-serif text-base group-hover:text-lamp-2">
                    {p.title}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 诗词 */}
        {poems.length > 0 && (
          <section>
            <SectionHead eyebrow="诗词" title="笺上新句" more="/poems" />
            <div className="grid gap-4 sm:grid-cols-3">
              {poems.map((p) => (
                <Link
                  key={p.id}
                  href={`/poems/${p.id}`}
                  className="group relative overflow-hidden rounded-lg border hairline bg-ink-2/60 px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-lamp/40"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-serif text-base group-hover:text-lamp-2">
                      {p.title}
                    </p>
                    <span className="shrink-0 text-xs text-fog">
                      {p.dynasty} · {p.author || "佚名"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-1 font-serif text-sm text-paper/70">
                    「{p.content.split("\n")[0]?.trim()}」
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 游戏角 */}
        {games.length > 0 && (
          <section>
            <SectionHead eyebrow="游戏角" title="打一局再走" more="/games" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {games.map((g) => (
                <Link
                  key={g.id}
                  href={g.builtin ? `/games/${g.slug}` : `/games/play/${g.id}`}
                  className="group rounded-lg border hairline bg-ink-2/60 p-5 transition-all hover:-translate-y-0.5 hover:border-lamp/40"
                >
                  <span className="text-3xl" aria-hidden>
                    {g.icon}
                  </span>
                  <p className="mt-3 font-serif text-lg group-hover:text-lamp-2">{g.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-fog">{g.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
