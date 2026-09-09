import type { NextConfig } from "next";

/**
 * 双模式构建：
 * - 默认（服务器模式）：output: "standalone"，`next build && next start`
 *   页面为客户端渲染 + 同源 API，网页部署行为不变。
 * - BUILD_STATIC=1（桌面模式）：output: "export" 静态导出到 out/，
 *   交给 Electron/Tauri 壳加载；API 地址由 NEXT_PUBLIC_API_BASE 注入。
 *
 * 桌面模式用 pageExtensions 排除全部 .ts 路由文件：
 * app/api 下的 route.ts（后端只在服务器跑，静态站点不包含）与 proxy.ts
 * （网页守卫，桌面模式由 admin 布局的客户端守卫替代）。所有页面均为 .tsx，
 * 不受影响。
 */
const isStatic = process.env.BUILD_STATIC === "1";

const nextConfig: NextConfig = {
  ...(isStatic ? { output: "export" as const } : { output: "standalone" as const }),
  ...(isStatic ? { images: { unoptimized: true } } : {}),
  ...(isStatic ? { pageExtensions: ["tsx", "jsx"] } : {}),
};

export default nextConfig;
