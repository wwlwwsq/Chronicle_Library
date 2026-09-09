/**
 * 前端 API 基座：同一套前端代码跑在两种环境里。
 *
 * - 网页模式：前端与 API 同源部署（Next standalone），API_BASE 为空，走相对路径 + cookie。
 * - 桌面模式：静态导出后由 Electron/Tauri 壳加载，构建时通过
 *   NEXT_PUBLIC_API_BASE=https://你的域名 指向远程后端；管理接口用
 *   Authorization: Bearer token（登录时存入 localStorage）携带凭据。
 */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

/** 拼接 API 地址：path 以 / 开头（如 /api/books） */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/** 上传文件的访问地址：relPath 是库里存的相对路径（如 books/covers/x.png） */
export function fileUrl(relPath: string | null | undefined): string {
  if (!relPath) return "";
  return `${API_BASE}/api/files/${relPath}`;
}

/** 路径参数转正整数 id，非法返回 null（与 lib/api.ts 服务端版本行为一致） */
export function toId(v: string | undefined | null): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const TOKEN_KEY = "mbw:token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

/** 带凭据的 fetch：cookie（同源）+ Bearer（桌面模式）双通道，后端两者都认 */
export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(apiUrl(url), { ...init, headers, credentials: "include" });
}
