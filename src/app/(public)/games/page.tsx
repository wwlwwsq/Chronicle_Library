import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "游戏角" };

export default async function GamesPage() {
  const games = await db.game.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const builtin = games.filter((g) => g.builtin);
  const external = games.filter((g) => !g.builtin);

  const card =
    "group rounded-lg border hairline bg-ink-2/60 p-6 transition-all hover:-translate-y-0.5 hover:border-lamp/40";

  return (
    <div className="lamp-glow min-h-[calc(100vh-56px)]">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <header className="mb-10">
          <p className="mb-1 text-xs tracking-[0.3em] text-lamp">游戏角</p>
          <h1 className="font-serif text-3xl">打一局再走</h1>
          <p className="mt-2 text-sm text-fog">
            这儿有三款随开随玩的小游戏，都是后台收录的藏货。键盘、手机都能玩。
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {builtin.map((g) => (
            <Link key={g.id} href={`/games/${g.slug}`} className={card}>
              <span className="text-4xl" aria-hidden>
                {g.icon}
              </span>
              <p className="mt-4 font-serif text-xl group-hover:text-lamp-2">{g.title}</p>
              <p className="mt-1.5 text-sm leading-6 text-fog">{g.description}</p>
              <p className="mt-4 text-sm text-lamp-2 opacity-0 transition-opacity group-hover:opacity-100">
                开始一局 →
              </p>
            </Link>
          ))}
        </div>

        {external.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-5 font-serif text-2xl">收藏的别处好玩的</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {external.map((g) => (
                <Link key={g.id} href={`/games/play/${g.id}`} className={`${card} p-5`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>
                      {g.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-serif text-base group-hover:text-lamp-2">
                        {g.title}
                      </p>
                      <p className="truncate text-xs text-fog">
                        {g.url ? new URL(g.url).host : ""}
                      </p>
                    </div>
                  </div>
                  {g.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-fog">{g.description}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {games.length === 0 && (
          <div className="rounded-lg border border-dashed hairline px-6 py-16 text-center">
            <p className="text-fog">
              游戏角还没开张。{" "}
              <Link href="/admin/games" className="text-lamp-2 hover:underline">
                去后台添加 →
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
