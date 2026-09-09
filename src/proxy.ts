import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/jwt";

// Next.js 16：middleware 文件约定已更名为 proxy（导出函数名同步改为 proxy）

/** 桌面应用（Tauri/Electron webview）等可信来源；其余用 CORS_ORIGINS 追加 */
const DEFAULT_EXTRA_ORIGINS = [
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
];

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const extra = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowlist = [...DEFAULT_EXTRA_ORIGINS, ...extra];
  if (allowlist.includes(origin)) return origin;
  // 本地开发与 Electron 壳（http://127.0.0.1:端口）
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return origin;
  return null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Credentials"] = "true";
  }
  return h;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API 跨域支持：预检直接应答，正常响应附带 CORS 头
  if (pathname.startsWith("/api")) {
    const origin = allowedOrigin(req.headers.get("origin"));
    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
    }
    const res = NextResponse.next();
    for (const [k, v] of Object.entries(corsHeaders(origin))) {
      res.headers.set(k, v);
    }
    return res;
  }

  // /admin 网页守卫（仅服务器渲染模式生效；桌面静态导出不经过这里，由客户端守卫）
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith("/admin/login")) {
    if (session) return NextResponse.redirect(new URL("/admin", req.url));
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
