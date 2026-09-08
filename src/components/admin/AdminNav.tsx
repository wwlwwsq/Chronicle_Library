"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "仪表盘", icon: "🕯️" },
  { href: "/admin/books", label: "图书", icon: "📚" },
  { href: "/admin/comics", label: "漫画", icon: "🎨" },
  { href: "/admin/poems", label: "诗词", icon: "📜" },
  { href: "/admin/posts", label: "随笔", icon: "✍️" },
  { href: "/admin/games", label: "游戏", icon: "🎮" },
  { href: "/admin/settings", label: "设置", icon: "⚙️" },
];

export default function AdminNav({ username }: { username: string }) {
  const pathname = usePathname();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <aside className="border-b hairline lg:min-h-screen lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-2 px-5 py-4 lg:block">
        <Link href="/admin" className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block size-2 rounded-full bg-lamp shadow-[0_0_10px_2px_rgba(230,169,68,0.5)]"
          />
          <span className="font-serif">书房后台</span>
        </Link>
        <p className="hidden text-xs text-fog lg:mt-1 lg:block">@{username}</p>
      </div>

      <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-2 lg:flex-col lg:px-3">
        {LINKS.map((l) => {
          const active =
            l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-lamp/10 text-lamp-2"
                  : "text-fog hover:bg-ink-2 hover:text-paper"
              }`}
            >
              <span aria-hidden>{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
        <div className="flex shrink-0 items-center gap-1 lg:mt-4 lg:flex-col lg:items-stretch">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-fog transition-colors hover:bg-ink-2 hover:text-paper"
          >
            <span aria-hidden>🏠</span> 回前台
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-fog transition-colors hover:bg-ink-2 hover:text-red-300"
          >
            <span aria-hidden>🚪</span> 退出登录
          </button>
        </div>
      </nav>
    </aside>
  );
}
