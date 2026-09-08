"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const COLS = 20;
const ROWS = 20;
const BEST_KEY = "mbw:game:snake:best";

type Point = { x: number; y: number };
type State = "idle" | "running" | "paused" | "over";

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snake = useRef<Point[]>([{ x: 10, y: 10 }]);
  const dir = useRef<Point>({ x: 1, y: 0 });
  const queuedDirs = useRef<Point[]>([]);
  const food = useRef<Point>({ x: 14, y: 10 });
  const [state, setState] = useState<State>("idle");
  const stateRef = useRef<State>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  // eslint-disable-next-line react-hooks/refs -- 渲染期同步 ref 与 state，游戏循环（定时器闭包）需读取最新状态
  stateRef.current = state;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时从 localStorage 恢复最高分，SSR 无该 API
    setBest(Number(localStorage.getItem(BEST_KEY) || "0"));
  }, []);

  // 游戏结束时刷新最高分
  useEffect(() => {
    if (state !== "over") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 由 score/state 变化派生 best，属 React 认可的“状态调整”模式
    setBest((b) => {
      if (score > b) {
        localStorage.setItem(BEST_KEY, String(score));
        return score;
      }
      return b;
    });
  }, [state, score]);

  const placeFood = useCallback(() => {
    while (true) {
      const p = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
      if (!snake.current.some((s) => s.x === p.x && s.y === p.y)) {
        food.current = p;
        return;
      }
    }
  }, []);

  const reset = useCallback(() => {
    snake.current = [{ x: 10, y: 10 }];
    dir.current = { x: 1, y: 0 };
    queuedDirs.current = [];
    placeFood();
    setScore(0);
  }, [placeFood]);

  const start = useCallback(() => {
    reset();
    setState("running");
  }, [reset]);

  const turn = useCallback((nd: Point) => {
    const last = queuedDirs.current.at(-1) || dir.current;
    if (last.x === -nd.x && last.y === -nd.y) return; // 不能直接掉头
    if (last.x === nd.x && last.y === nd.y) return;
    if (queuedDirs.current.length < 2) queuedDirs.current.push(nd);
  }, []);

  // 主循环
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const cell = canvas.width / COLS;

    const draw = () => {
      ctx.fillStyle = "#101b29";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 网格微光
      ctx.fillStyle = "rgba(36,56,79,0.35)";
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if ((r + c) % 2 === 0) ctx.fillRect(c * cell, r * cell, cell, cell);
        }
      }

      // 食物
      ctx.fillStyle = "#e6a944";
      ctx.beginPath();
      ctx.arc(
        (food.current.x + 0.5) * cell,
        (food.current.y + 0.5) * cell,
        cell * 0.34,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // 蛇
      snake.current.forEach((seg, i) => {
        const t = i / Math.max(1, snake.current.length - 1);
        ctx.fillStyle = i === 0 ? "#a8cfb6" : `rgba(127,174,142,${0.95 - t * 0.5})`;
        const pad = i === 0 ? 1 : 2;
        ctx.beginPath();
        ctx.roundRect(seg.x * cell + pad, seg.y * cell + pad, cell - pad * 2, cell - pad * 2, 4);
        ctx.fill();
      });
    };

    const step = () => {
      const nd = queuedDirs.current.shift();
      if (nd) dir.current = nd;
      const head = snake.current[0];
      const nextHead = { x: head.x + dir.current.x, y: head.y + dir.current.y };

      const hitWall =
        nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= COLS || nextHead.y >= ROWS;
      const hitSelf = snake.current.some(
        (s, i) => i < snake.current.length - 1 && s.x === nextHead.x && s.y === nextHead.y
      );
      if (hitWall || hitSelf) {
        setState("over");
        return;
      }

      snake.current = [nextHead, ...snake.current];
      if (nextHead.x === food.current.x && nextHead.y === food.current.y) {
        setScore((s) => s + 1);
        placeFood();
      } else {
        snake.current.pop();
      }
      draw();
    };

    draw();

    const timer = setInterval(() => {
      if (stateRef.current !== "running") return;
      step();
    }, 140);

    return () => clearInterval(timer);
  }, [placeFood]);

  // 键盘
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Point> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
      };
      const nd = map[e.key];
      if (nd) {
        e.preventDefault();
        turn(nd);
      }
      if (e.key === " " && (state === "running" || state === "paused")) {
        e.preventDefault();
        setState((s) => (s === "running" ? "paused" : "running"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn, state]);

  const dpad =
    "flex size-12 items-center justify-center rounded-lg bg-ink-2 text-lg text-paper select-none active:bg-ink-3";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-8">
      <div className="mb-4 flex w-full items-end justify-between">
        <Link href="/games" className="text-sm text-fog transition-colors hover:text-paper">
          ← 游戏角
        </Link>
        <div className="flex gap-3 text-sm">
          <span className="rounded-md bg-ink-2 px-3 py-1.5">
            长度 <b className="font-mono text-lamp-2">{score + 1}</b>
          </span>
          <span className="rounded-md bg-ink-2 px-3 py-1.5">
            最佳 <b className="font-mono text-paper">{best + 1}</b>
          </span>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={360}
          height={360}
          className="max-w-full rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
        />
        {state !== "running" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-ink/85">
            <p className="font-serif text-2xl">
              {state === "idle" ? "贪吃蛇" : state === "paused" ? "暂停中" : "撞到了"}
            </p>
            <p className="text-sm text-fog">
              {state === "idle"
                ? "吃掉光点变长，别撞墙也别咬到自己。"
                : state === "paused"
                  ? "按空格继续。"
                  : `本局长度 ${score + 1}，再来一条？`}
            </p>
            <button
              type="button"
              onClick={state === "paused" ? () => setState("running") : start}
              className="rounded-md bg-lamp px-5 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lamp-2"
            >
              {state === "idle" ? "开始" : state === "paused" ? "继续" : "再来一局"}
            </button>
          </div>
        )}
      </div>

      {/* 触屏方向键 */}
      <div className="mt-6 grid grid-cols-3 gap-2 sm:hidden">
        <span />
        <button type="button" className={dpad} onClick={() => turn({ x: 0, y: -1 })} aria-label="上">
          ↑
        </button>
        <span />
        <button type="button" className={dpad} onClick={() => turn({ x: -1, y: 0 })} aria-label="左">
          ←
        </button>
        <button
          type="button"
          className={dpad}
          onClick={() => setState((s) => (s === "running" ? "paused" : s === "paused" ? "running" : s))}
          aria-label="暂停"
        >
          ⏸
        </button>
        <button type="button" className={dpad} onClick={() => turn({ x: 1, y: 0 })} aria-label="右">
          →
        </button>
        <span />
        <button type="button" className={dpad} onClick={() => turn({ x: 0, y: 1 })} aria-label="下">
          ↓
        </button>
        <span />
      </div>

      <p className="mt-5 text-center text-sm text-fog sm:block hidden">
        方向键 / WASD 转向，空格暂停。
      </p>
    </div>
  );
}
