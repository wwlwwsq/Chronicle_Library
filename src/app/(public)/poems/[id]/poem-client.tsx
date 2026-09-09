"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authFetch, fileUrl, toId } from "@/lib/api-base";

type Poem = {
  id: number;
  title: string;
  author: string;
  dynasty: string;
  style: string;
  content: string;
  note: string;
  posterPath: string | null;
  comicPath: string | null;
};

/** 海报 / 漫画的素雅预留位：未上传配图时保持版面完整 */
function ImageSlot({
  kind,
  path,
  alt,
}: {
  kind: "poster" | "comic";
  path: string | null;
  alt: string;
}) {
  const label = kind === "poster" ? "海报" : "漫画";
  const hint = kind === "poster" ? "待题" : "待绘";
  return (
    <figure className="mt-10">
      <figcaption className="mb-3 flex items-center gap-3">
        <span className="font-serif text-sm tracking-[0.3em] text-lamp">{label}</span>
        <span className="h-px flex-1 bg-line/60" />
      </figcaption>
      {path ? (
        <img
          src={fileUrl(path)}
          alt={alt}
          className="mx-auto max-h-[520px] w-auto rounded-lg border hairline object-contain"
        />
      ) : (
        <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-lg border border-dashed hairline">
          <span className="font-serif text-2xl text-fog/60">{hint}</span>
          <span className="text-xs text-fog/50">
            {label}图还未配上，后台可上传
          </span>
        </div>
      )}
    </figure>
  );
}

export default function PoemClient() {
  const params = useParams<{ id: string }>();
  const poemId = toId(Array.isArray(params?.id) ? params.id[0] : params?.id);
  const invalid = !poemId;
  const [poem, setPoem] = useState<Poem | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!poemId) return;
    let alive = true;
    authFetch(`/api/poems/${poemId}`)
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.json();
      })
      .then((d) => alive && setPoem(d))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [poemId]);

  if (invalid || missing) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-serif text-2xl">这一页诗找不到了</p>
        <Link href="/poems" className="text-sm text-lamp-2 hover:underline">
          ← 回诗词
        </Link>
      </div>
    );
  }

  if (!poem) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-fog">正在展卷…</p>
      </div>
    );
  }

  return (
    <div className="lamp-glow min-h-[calc(100vh-56px)]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/poems"
          className="text-sm text-fog transition-colors hover:text-paper"
        >
          ← 回诗词
        </Link>

        {/* 海报（预留位） */}
        <ImageSlot kind="poster" path={poem.posterPath} alt={`${poem.title} 海报图`} />

        {/* 题名 */}
        <header className="mt-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-3 text-xs">
            <span className="rounded-full border hairline px-3 py-1 tracking-widest text-fog">
              {poem.dynasty}
            </span>
            <span className="rounded-full border hairline px-3 py-1 tracking-widest text-fog">
              {poem.style}
            </span>
          </div>
          <h1 className="font-serif text-4xl tracking-[0.15em]">{poem.title}</h1>
          <p className="mt-4 text-sm tracking-[0.3em] text-fog">
            {poem.author ? `${poem.author} · ${poem.dynasty}` : poem.dynasty}
          </p>
        </header>

        {/* 诗文 */}
        <div className="mt-10 border-y hairline px-4 py-12">
          <p className="whitespace-pre-line text-center font-serif text-xl leading-[2.4] tracking-[0.2em] text-paper/90">
            {poem.content}
          </p>
        </div>

        {/* 笺注 */}
        {poem.note && (
          <section className="mt-10">
            <h2 className="mb-3 flex items-center gap-3 font-serif text-sm tracking-[0.3em] text-lamp">
              笺注
              <span className="h-px flex-1 bg-line/60" />
            </h2>
            <p className="whitespace-pre-line border-l-2 border-lamp/30 pl-4 text-sm leading-7 text-fog">
              {poem.note}
            </p>
          </section>
        )}

        {/* 漫画（预留位） */}
        <ImageSlot kind="comic" path={poem.comicPath} alt={`${poem.title} 漫画图`} />
      </div>
    </div>
  );
}
