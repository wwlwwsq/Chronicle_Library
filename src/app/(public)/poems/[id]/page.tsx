import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const poemId = Number(id);
  if (!Number.isInteger(poemId)) return { title: "诗词" };
  const poem = await db.poem.findUnique({ where: { id: poemId } });
  return { title: poem ? `${poem.title} · 诗词` : "诗词" };
}

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
          src={`/api/files/${path}`}
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

export default async function PoemDetailPage({ params }: Props) {
  const { id } = await params;
  const poemId = Number(id);
  if (!Number.isInteger(poemId) || poemId <= 0) notFound();
  const poem = await db.poem.findUnique({ where: { id: poemId } });
  if (!poem) notFound();

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
