import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { toId } from "@/lib/api";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const gameId = toId(id);
  if (!gameId) return { title: "外部游戏" };
  const game = await db.game.findUnique({ where: { id: gameId } });
  return { title: game ? game.title : "外部游戏" };
}

export default async function PlayGamePage({ params }: Props) {
  const gameId = toId((await params).id);
  if (!gameId) notFound();
  const game = await db.game.findUnique({ where: { id: gameId } });
  if (!game || game.builtin || !game.url) notFound();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink">
      <header className="flex h-13 shrink-0 items-center gap-3 border-b hairline px-3 sm:px-5">
        <Link
          href="/games"
          className="rounded-md px-2.5 py-1.5 text-sm text-fog transition-colors hover:text-paper"
        >
          ← 游戏角
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center font-serif text-sm sm:text-base">
          {game.icon} {game.title}
        </h1>
        <a
          href={game.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-line/70 px-3 py-1.5 text-xs text-fog transition-colors hover:border-lamp/50 hover:text-paper sm:text-sm"
        >
          新窗口打开 ↗
        </a>
      </header>
      <iframe
        src={game.url}
        title={game.title}
        className="flex-1 border-0 bg-white"
        allow="fullscreen; autoplay; gamepad"
        referrerPolicy="no-referrer"
      />
      <footer className="flex h-10 shrink-0 items-center justify-center border-t hairline px-4">
        <p className="text-center text-xs text-fog">
          游戏内容来自外部网站，若加载异常请点右上角「新窗口打开」。
        </p>
      </footer>
    </div>
  );
}
