import type { Metadata } from "next";
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

/**
 * 主题初始化内联脚本：在首帧渲染前把 data-theme 设到 <html> 上，
 * 避免主题闪烁。读 cookie（服务端渲染时代写入的值）→ 回退 localStorage
 * （桌面静态模式）。不能在 layout 里 await cookies()：静态导出（桌面构建）
 * 不支持动态 API。
 */
const themeInitScript = `
(function () {
  try {
    var m = document.cookie.match(/(?:^|;\\s*)mbw:theme=([^;]+)/);
    var t = m ? decodeURIComponent(m[1]) : (localStorage.getItem("mbw:theme") || "night");
    if (${JSON.stringify(THEME_IDS)}.indexOf(t) < 0) t = "night";
    document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      data-theme="night"
      data-scroll-behavior="smooth"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-ink text-paper">{children}</body>
    </html>
  );
}
