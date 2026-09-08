import { NextResponse } from "next/server";
import { requireAdmin, type SessionPayload } from "./auth";
import { BOOK_EXTS, IMAGE_EXTS } from "./storage";

/** 上传文件大小上限（小内存 VPS 友好） */
export const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

/** 封面图上限：封面只作展示，过大通常是选错了文件 */
export const MAX_COVER_BYTES = 20 * 1024 * 1024;

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** 需要管理员的 API 路由统一入口：未登录返回 401 */
export async function withAdmin(
  fn: (session: SessionPayload) => Promise<NextResponse>
) {
  const session = await requireAdmin();
  if (!session) return jsonError("请先登录后台", 401);
  return fn(session);
}

/** 路径参数转正整数 id，非法返回 null */
export function toId(v: string): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function str(form: FormData, key: string, fallback = "") {
  const v = form.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s || fallback;
}

export function fileOf(form: FormData, key: string): File | null {
  const v = form.get(key);
  return v instanceof File && v.size > 0 ? v : null;
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(err: unknown) {
  console.error(err);
  const message = err instanceof Error ? err.message : "服务器内部错误";
  return NextResponse.json({ error: message }, { status: 500 });
}

export { BOOK_EXTS, IMAGE_EXTS };
