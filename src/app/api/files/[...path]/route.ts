import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { extOf, resolveSafe } from "@/lib/storage";
import { serverError } from "@/lib/api";

const MIME: Record<string, string> = {
  ".epub": "application/epub+zip",
  ".txt": "text/plain; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

type Params = { params: Promise<{ path: string[] }> };

/**
 * 受控文件服务：只允许读取上传目录内的文件。
 * 用 ETag 协商缓存（no-cache）而不是长缓存——漫画页等固定路径的文件
 * 被替换后，浏览器能立即拿到新版本，命中时通过 304 免去重复下载。
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { path: parts } = await params;
    const abs = resolveSafe(parts.map(decodeURIComponent).join("/"));
    const [data, stat] = await Promise.all([fs.readFile(abs), fs.stat(abs)]);
    const etag = `W/"${stat.size.toString(36)}-${Math.floor(stat.mtimeMs).toString(36)}"`;

    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    const type = MIME[extOf(abs)] || "application/octet-stream";
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "no-cache",
        ETag: etag,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "非法路径") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return serverError(err);
  }
}
