import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "诗词" };

/** 年代按朝代先后排列，未收录的朝代按出现顺序附在最后 */
const DYNASTY_ORDER = [
  "先秦",
  "汉魏",
  "南北朝",
  "隋",
  "唐",
  "五代",
  "宋",
  "元",
  "明",
  "清",
  "近现代",
];

function ordered(values: string[], canonical: string[]) {
  const set = Array.from(new Set(values));
  const head = canonical.filter((c) => set.includes(c));
  return [...head, ...set.filter((v) => !canonical.includes(v))];
}

function chipHref(current: { dynasty?: string; style?: string }, key: "dynasty" | "style", value: string) {
  const params = new URLSearchParams();
  const merged = { ...current, [key]: value };
  if (merged.dynasty && merged.dynasty !== "全部") params.set("dynasty", merged.dynasty);
  if (merged.style && merged.style !== "全部") params.set("style", merged.style);
  const qs = params.toString();
  return qs ? `/poems?${qs}` : "/poems";
}

export default async function PoemsPage({
  searchParams,
}: {
  searchParams: Promise<{ dynasty?: string; style?: string }>;
}) {
  const { dynasty = "", style = "" } = await searchParams;
  const all = await db.poem.findMany({ orderBy: { createdAt: "desc" } });

  const dynasties = ordered(all.map((p) => p.dynasty), DYNASTY_ORDER);
  const styles = ordered(all.map((p) => p.style), []);

  const filtered = all.filter(
    (p) => (!dynasty || p.dynasty === dynasty) && (!style || p.style === style)
  );

  return (
    <div className="lamp-glow min-h-[calc(100vh-56px)]">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <header className="mb-10 text-center">
          <p className="mb-2 text-xs tracking-[0.4em] text-lamp">诗 词</p>
          <h1 className="font-serif text-3xl tracking-wide">笺上得句 {all.length} 首</h1>
          <p className="mt-3 text-sm leading-6 text-fog">
            按年代与风格拾掇成册，偶得海报名画，也一并挂在这里。
          </p>
        </header>

        {/* 年代 · 风格 两个维度的筛选 */}
        <nav className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 font-serif text-sm text-fog/80">年代</span>
          {["全部", ...dynasties].map((d) => (
            <Link
              key={d}
              href={chipHref({ dynasty, style }, "dynasty", d)}
              className={`rounded-full border px-3 py-1 text-xs tracking-wider transition-colors ${
                (dynasty || "全部") === d
                  ? "border-lamp/60 bg-lamp/10 text-lamp-2"
                  : "hairline text-fog hover:border-lamp/40 hover:text-paper"
              }`}
            >
              {d}
            </Link>
          ))}
        </nav>
        <nav className="mb-10 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 font-serif text-sm text-fog/80">风格</span>
          {["全部", ...styles].map((s) => (
            <Link
              key={s}
              href={chipHref({ dynasty, style }, "style", s)}
              className={`rounded-full border px-3 py-1 text-xs tracking-wider transition-colors ${
                (style || "全部") === s
                  ? "border-lamp/60 bg-lamp/10 text-lamp-2"
                  : "hairline text-fog hover:border-lamp/40 hover:text-paper"
              }`}
            >
              {s}
            </Link>
          ))}
        </nav>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed hairline px-6 py-16 text-center">
            <p className="font-serif text-fog">
              这一格还没有诗句。{" "}
              <Link href="/admin/poems" className="text-lamp-2 hover:underline">
                去后台录一首 →
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((p) => {
              const firstLine = p.content.split("\n")[0]?.trim() || "";
              return (
                <Link
                  key={p.id}
                  href={`/poems/${p.id}`}
                  className="group relative overflow-hidden rounded-lg border hairline bg-ink-2/40 px-6 py-5 transition-all hover:-translate-y-0.5 hover:border-lamp/40 hover:bg-ink-2/70"
                >
                  {/* 左侧素雅竖线，hover 点亮 */}
                  <span
                    aria-hidden
                    className="absolute inset-y-4 left-0 w-px bg-line transition-colors group-hover:bg-lamp/60"
                  />
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="truncate font-serif text-lg tracking-wide group-hover:text-lamp-2">
                      {p.title}
                    </h2>
                    <span className="shrink-0 rounded-full border hairline px-2 py-0.5 text-[11px] text-fog">
                      {p.style}
                    </span>
                  </div>
                  <p className="mt-1 text-xs tracking-wide text-fog">
                    {p.dynasty} · {p.author || "佚名"}
                  </p>
                  <p className="mt-3 line-clamp-2 font-serif leading-7 text-paper/75">
                    「{firstLine}」
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
