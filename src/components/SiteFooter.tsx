import Link from "next/link";
import { site } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="border-t hairline">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm text-fog sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          {site.name} · {site.tagline}
        </p>
        <p className="flex items-center gap-3">
          <span>一盏灯，几本书，慢慢来。</span>
          <Link href="/admin" className="transition-colors hover:text-lamp-2">
            管理
          </Link>
        </p>
      </div>
    </footer>
  );
}
