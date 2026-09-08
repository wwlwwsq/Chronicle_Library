import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
};

const THEME_IDS = ["night", "day", "ink-wash", "forest", "terminal"];

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // 主题走 cookie 在服务端渲染，避免水合时 data-theme 被重置，也没有首屏闪烁
  const theme = (await cookies()).get("mbw:theme")?.value ?? "night";
  const safeTheme = THEME_IDS.includes(theme) ? theme : "night";

  return (
    <html
      lang="zh-CN"
      data-theme={safeTheme}
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-ink text-paper">{children}</body>
    </html>
  );
}
