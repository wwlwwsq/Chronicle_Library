import Link from "next/link";
import { fileUrl } from "@/lib/api-base";

/** 封面图：有封面用封面，没有就生成一张竖排书名的“素书皮” */
export function Cover({
  title,
  coverPath,
  href,
  className = "",
}: {
  title: string;
  coverPath: string | null;
  href: string;
  className?: string;
}) {
  const inner = coverPath ? (
    <img
      src={fileUrl(coverPath)}
      alt={`《${title}》封面`}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-3 to-ink-2 p-3">
      <span className="spine-text font-serif text-base leading-snug text-paper/85 line-clamp-6">
        {title}
      </span>
    </div>
  );

  return (
    <Link
      href={href}
      className={`group block overflow-hidden rounded-lg border hairline bg-ink-2 shadow-[0_2px_12px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-0.5 hover:border-lamp/40 ${className}`}
    >
      {inner}
    </Link>
  );
}
