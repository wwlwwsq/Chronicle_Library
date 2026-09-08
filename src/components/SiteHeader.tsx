"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { site } from "@/lib/site";
import ThemeSwitcher from "@/components/ThemeSwitcher";

const NAV = [
  { href: "/books", label: "书架" },
  { href: "/comics", label: "画匣" },
  { href: "/blog", label: "随笔" },
  { href: "/games", label: "游戏角" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b hairline bg-ink/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-block size-2.5 rounded-full bg-lamp shadow-[0_0_12px_2px_rgba(230,169,68,0.55)]"
          />
          <span className="font-serif text-lg tracking-wide">{site.name}</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors hover:text-paper ${
                isActive(item.href) ? "text-lamp-2" : "text-fog"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="rounded-md border hairline px-3 py-1.5 text-sm text-fog transition-colors hover:border-lamp/50 hover:text-lamp-2"
          >
            后台
          </Link>
          <span className="ml-1">
            <ThemeSwitcher />
          </span>
        </nav>

        <button
          type="button"
          aria-label={open ? "收起菜单" : "展开菜单"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="ml-auto rounded-md p-2 text-fog hover:text-paper sm:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            {open ? (
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="border-t hairline px-4 pb-3 pt-2 sm:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block rounded-md px-3 py-2 text-sm ${
                isActive(item.href) ? "text-lamp-2" : "text-fog"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-2 text-sm text-fog"
          >
            后台
          </Link>
          <div className="px-3 py-2">
            <ThemeSwitcher compact />
          </div>
        </nav>
      )}
    </header>
  );
}
