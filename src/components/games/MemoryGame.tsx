"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const EMOJIS = ["🌙", "⭐", "📕", "🏮", "🎲", "🐍", "🍄", "🔮"];
const BEST_KEY = "mbw:game:memory:best";

type Card = { id: number; emoji: string; flipped: boolean; matched: boolean };

function deal(): Card[] {
  const cards = [...EMOJIS, ...EMOJIS]
    .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }))
    .map((c) => ({ ...c, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ emoji }, i) => ({ id: i + 100, emoji, flipped: false, matched: false }));
  return cards;
}

export default function MemoryGame() {
  const [cards, setCards] = useState<Card[]>(deal);
  const [first, setFirst] = useState<number | null>(null);
  const [lock, setLock] = useState(false);
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);

  const matchedAll = cards.length > 0 && cards.every((c) => c.matched);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时从 localStorage 恢复最高纪录，SSR 无该 API
    setBest(Number(localStorage.getItem(BEST_KEY)) || null);
  }, []);

  useEffect(() => {
    if (startedAt === null || matchedAll) return;
    const t = setInterval(
      () => setSeconds(Math.round((Date.now() - startedAt) / 1000)),
      1000
    );
    return () => clearInterval(t);
  }, [startedAt, matchedAll]);

  const restart = useCallback(() => {
    setCards(deal());
    setFirst(null);
    setLock(false);
    setMoves(0);
    setSeconds(0);
    setStartedAt(null);
  }, []);

  const flip = (idx: number) => {
    if (lock) return;
    const card = cards[idx];
    if (card.flipped || card.matched) return;
    // eslint-disable-next-line react-hooks/purity -- flip 是点击事件处理器而非渲染期调用，读取时钟无纯度问题
    if (startedAt === null) setStartedAt(Date.now());

    const next = cards.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
    setCards(next);

    if (first === null) {
      setFirst(idx);
      return;
    }

    setMoves((m) => m + 1);
    const a = next[first];
    const b = next[idx];
    if (a.emoji === b.emoji) {
      const done = next.map((c, i) =>
        i === first || i === idx ? { ...c, matched: true } : c
      );
      setCards(done);
      setFirst(null);
      if (done.every((c) => c.matched)) {
        setBest((prevBest) => {
          if (prevBest === null || moves + 1 < prevBest) {
            localStorage.setItem(BEST_KEY, String(moves + 1));
            return moves + 1;
          }
          return prevBest;
        });
      }
    } else {
      setLock(true);
      setTimeout(() => {
        setCards((cs) =>
          cs.map((c, i) =>
            i === first || i === idx ? { ...c, flipped: false } : c
          )
        );
        setFirst(null);
        setLock(false);
      }, 750);
    }
  };

  const minutes = useMemo(() => String(Math.floor(seconds / 60)).padStart(2, "0"), [seconds]);
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-5 flex items-end justify-between">
        <Link href="/games" className="text-sm text-fog transition-colors hover:text-paper">
          ← 游戏角
        </Link>
        <div className="flex gap-3 text-sm">
          <span className="rounded-md bg-ink-2 px-3 py-1.5">
            步数 <b className="font-mono text-lamp-2">{moves}</b>
          </span>
          <span className="rounded-md bg-ink-2 px-3 py-1.5">
            用时 <b className="font-mono text-paper">{minutes}:{secs}</b>
          </span>
        </div>
      </div>

      <div className="relative grid grid-cols-4 gap-3">
        {cards.map((card, i) => (
          <button
            key={card.id}
            type="button"
            onClick={() => flip(i)}
            className="relative aspect-square [perspective:600px]"
            aria-label={card.flipped || card.matched ? card.emoji : "未翻开的牌"}
          >
            <span
              className={`flip-card absolute inset-0 block ${
                card.flipped || card.matched ? "flipped" : ""
              }`}
            >
              {/* 背面（牌背） */}
              <span className="flip-face absolute inset-0 flex items-center justify-center rounded-lg border hairline bg-gradient-to-br from-ink-3 to-ink-2 text-2xl text-fog">
                ✦
              </span>
              {/* 正面 */}
              <span
                className={`flip-face flip-back absolute inset-0 flex items-center justify-center rounded-lg border text-3xl ${
                  card.matched
                    ? "border-lamp/60 bg-lamp/15"
                    : "hairline bg-ink-2"
                }`}
              >
                {card.emoji}
              </span>
            </span>
          </button>
        ))}

        {matchedAll && (
          <div className="absolute -inset-2 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-ink/90">
            <p className="font-serif text-2xl">全部配对！</p>
            <p className="text-sm text-fog">
              {moves} 步 · {minutes}:{secs} 找齐所有图案。
            </p>
            <button
              type="button"
              onClick={restart}
              className="rounded-md bg-lamp px-5 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lamp-2"
            >
              再来一局
            </button>
          </div>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-fog">
        翻开两张牌找相同图案，用最少的步数配齐全部 8 对。
        {best !== null && <> 最佳纪录 {best} 步。</>}
      </p>
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={restart}
          className="rounded-md border hairline px-4 py-1.5 text-sm text-fog transition-colors hover:border-lamp/50 hover:text-paper"
        >
          洗牌重开
        </button>
      </div>
    </div>
  );
}
