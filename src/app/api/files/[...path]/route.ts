import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { Readable } from "stream";
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
 * 用流式输出代替整文件读入内存——EPUB 最大允许 512MB，
 * 全量 readFile 会在多个并发下载时轻易打爆小内存 VPS。
 * 用 ETag 协商缓存（no-cache）而不是长缓存——漫画页等固定路径的文件
 * 被替换后，浏览器能立即拿到新版本，命中时通过 304 免去重复下载。
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { path: parts } = await params;
    const abs = resolveSafe(parts.map(decodeURIComponent).join("/"));

    // 先 stat 生成 ETag：304 分支无需读取文件内容
    const stat = await fs.stat(abs);
    const etag = `W/"${stat.size.toString(36)}-${Math.floor(stat.mtimeMs).toString(36)}"`;

    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    const type = MIME[extOf(abs)] || "application/octet-stream";
    const nodeStream = createReadStream(abs);
    return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
      headers: {
        "Content-Type": type,
        "Content-Length": String(stat.size),
        "Cache-Control": "no-cache",
        ETag: etag,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "非法路径") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "ENOENT"
    ) {
      return new NextResponse("Not Found", { status: 404 });
    }
    return serverError(err);
  }
}
