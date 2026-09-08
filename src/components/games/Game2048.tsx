"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const SIZE = 4;
type Dir = "up" | "down" | "left" | "right";

const TILE_STYLES: Record<number, { bg: string; fg: string }> = {
  2: { bg: "#2b3c52", fg: "#dfe6ee" },
  4: { bg: "#35485f", fg: "#dfe6ee" },
  8: { bg: "#8a6526", fg: "#f6ecd8" },
  16: { bg: "#a3742a", fg: "#f6ecd8" },
  32: { bg: "#bd822c", fg: "#fff" },
  64: { bg: "#d18f2f", fg: "#fff" },
  128: { bg: "#e6a944", fg: "#1b1503" },
  256: { bg: "#eeb558", fg: "#1b1503" },
  512: { bg: "#f2c179", fg: "#1b1503" },
  1024: { bg: "#f6cd93", fg: "#1b1503" },
  2048: { bg: "#ffd9a6", fg: "#1b1503" },
};

function emptyCells(cells: number[]) {
  return cells.reduce<number[]>((acc, v, i) => (v === 0 ? [...acc, i] : acc), []);
}

function addRandomTile(cells: number[]) {
  const empty = emptyCells(cells);
  if (empty.length === 0) return cells;
  const idx = empty[Math.floor(Math.random() * empty.length)];
  cells[idx] = Math.random() < 0.9 ? 2 : 4;
  return cells;
}

function canMove(cells: number[]) {
  if (cells.includes(0)) return true;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = cells[r * SIZE + c];
      if (c + 1 < SIZE && cells[r * SIZE + c + 1] === v) return true;
      if (r + 1 < SIZE && cells[(r + 1) * SIZE + c] === v) return true;
    }
  }
  return false;
}

function moveBoard(cells: number[], dir: Dir) {
  const next = [...cells];
  let gained = 0;
  let moved = false;
  for (let i = 0; i < SIZE; i++) {
    const line: number[] = [];
    for (let j = 0; j < SIZE; j++) {
      if (dir === "left") line.push(i * SIZE + j);
      else if (dir === "right") line.push(i * SIZE + (SIZE - 1 - j));
      else if (dir === "up") line.push(j * SIZE + i);
      else line.push((SIZE - 1 - j) * SIZE + i);
    }
    const vals = line.map((idx) => next[idx]).filter((v) => v !== 0);
    const merged: number[] = [];
    for (let k = 0; k < vals.length; k++) {
      if (k + 1 < vals.length && vals[k] === vals[k + 1]) {
        merged.push(vals[k] * 2);
        gained += vals[k] * 2;
        k++;
      } else merged.push(vals[k]);
    }
    while (merged.length < SIZE) merged.push(0);
    line.forEach((idx, pos) => {
      if (next[idx] !== merged[pos]) moved = true;
      next[idx] = merged[pos];
    });
  }
  return { next, gained, moved };
}

function freshBoard(): number[] {
  const cells = new Array(SIZE * SIZE).fill(0);
  addRandomTile(cells);
  addRandomTile(cells);
  return cells;
}

const BEST_KEY = "mbw:game:2048:best";

export default function Game2048() {
  const [cells, setCells] = useState<number[]>(freshBoard);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  // 键盘/触摸快速连按时的最新棋盘（保证移动计算不基于过期状态）
  const cellsRef = useRef(cells);
  // eslint-disable-next-line react-hooks/refs -- 渲染期同步 ref 与 state，保证快速连按读到的棋盘不过期（事件处理器读取）
  cellsRef.current = cells;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时从 localStorage 恢复最高分，SSR 无该 API
    setBest(Number(localStorage.getItem(BEST_KEY) || "0"));
  }, []);

  // 分数超过纪录时更新最高分
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 由 score 变化派生 best，属 React 认可的“状态调整”模式
    setBest((b) => {
      if (score > b) {
        localStorage.setItem(BEST_KEY, String(score));
        return score;
      }
      return b;
    });
  }, [score]);

  const restart = useCallback(() => {
    const board = freshBoard();
    cellsRef.current = board;
    setCells(board);
    setScore(0);
    setOver(false);
    setWon(false);
  }, []);

  const move = useCallback((dir: Dir) => {
    const { next, gained, moved } = moveBoard(cellsRef.current, dir);
    if (!moved) return;
    addRandomTile(next);
    cellsRef.current = next;
    setCells(next);
    if (gained > 0) setScore((s) => s + gained);
    if (next.includes(2048)) setWon(true);
    if (!canMove(next)) setOver(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        move(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 32) return;
    move(
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up"
    );
    touchStart.current = null;
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-5 flex items-end justify-between">
        <Link href="/games" className="text-sm text-fog transition-colors hover:text-paper">
          ← 游戏角
        </Link>
        <div className="flex gap-3 text-sm">
          <span className="rounded-md bg-ink-2 px-3 py-1.5">
            分数 <b className="font-mono text-lamp-2">{score}</b>
          </span>
          <span className="rounded-md bg-ink-2 px-3 py-1.5">
            最佳 <b className="font-mono text-paper">{best}</b>
          </span>
        </div>
      </div>

      <div
        className="relative touch-none rounded-xl bg-ink-2 p-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="grid grid-cols-4 gap-2.5">
          {cells.map((v, i) => (
            <div
              key={i}
              className="flex aspect-square items-center justify-center rounded-lg font-mono font-bold transition-colors"
              style={
                v === 0
                  ? { background: "rgba(36,56,79,0.4)" }
                  : {
                      background: TILE_STYLES[v]?.bg || "#ffd9a6",
                      color: TILE_STYLES[v]?.fg || "#1b1503",
                      fontSize: v >= 1024 ? "1.1rem" : v >= 128 ? "1.4rem" : "1.7rem",
                    }
              }
            >
              {v !== 0 && v}
            </div>
          ))}
        </div>

        {(over || won) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-ink/85">
            <p className="font-serif text-2xl">{won ? "2048 达成！" : "棋盘满了"}</p>
            <p className="text-sm text-fog">
              {won ? "这一局赢得漂亮。" : `本局 ${score} 分，再来一把？`}
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
        方向键 / WASD 滑动，手机上直接划屏幕。相同数字碰到会合并。
      </p>
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={restart}
          className="rounded-md border hairline px-4 py-1.5 text-sm text-fog transition-colors hover:border-lamp/50 hover:text-paper"
        >
          重新开始
        </button>
      </div>
    </div>
  );
}
