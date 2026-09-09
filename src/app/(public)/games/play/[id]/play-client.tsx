"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authFetch, toId } from "@/lib/api-base";

type Game = {
  id: number;
  title: string;
  url: string | null;
  builtin: boolean;
  icon: string;
};

export default function PlayClient() {
  const params = useParams<{ id: string }>();
  const gameId = toId(Array.isArray(params?.id) ? params.id[0] : params?.id);
  const invalid = !gameId;
  const [game, setGame] = useState<Game | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    let alive = true;
    authFetch(`/api/games/${gameId}`)
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.json();
      })
      .then((d) => alive && setGame(d))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [gameId]);

  if (invalid || missing || (game && (game.builtin || !game.url))) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-serif text-2xl">这个游戏不存在</p>
        <Link href="/games" className="text-sm text-lamp-2 hover:underline">
          ← 回游戏角
        </Link>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-fog">正在进场…</p>
      </div>
    );
  }

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
          href={game.url as string}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-line/70 px-3 py-1.5 text-xs text-fog transition-colors hover:border-lamp/50 hover:text-paper sm:text-sm"
        >
          新窗口打开 ↗
        </a>
      </header>
      <iframe
        src={game.url as string}
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
