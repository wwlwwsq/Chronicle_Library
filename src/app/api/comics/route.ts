import { NextRequest, NextResponse } from "next/server";
import { createWriteStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  MAX_COVER_BYTES,
  MAX_UPLOAD_BYTES,
  badRequest,
  fileOf,
  jsonError,
  serverError,
  str,
} from "@/lib/api";
import {
  IMAGE_EXTS,
  ensureParentDir,
  extOf,
  randomName,
  removeDir,
  resolveSafe,
  saveBuffer,
  saveToTempFile,
} from "@/lib/storage";
import { countComicPages, forEachComicPage } from "@/lib/comic";

export async function GET() {
  try {
    const comics = await db.comic.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { pages: true } } },
    });
    return NextResponse.json(comics);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return jsonError("请先登录后台", 401);
  let tmpZip: string | null = null;
  try {
    const form = await req.formData();
    const title = str(form, "title");
    const zipFile = fileOf(form, "file");
    if (!title) return badRequest("漫画名不能为空");
    if (!zipFile) return badRequest("请选择包含漫画图片的 zip 压缩包");
    if (!zipFile.name.toLowerCase().endsWith(".zip")) {
      return badRequest("漫画文件需要是 .zip 压缩包");
    }
    if (zipFile.size > MAX_UPLOAD_BYTES) {
      return badRequest("压缩包太大，上限 512MB");
    }
    const cover = fileOf(form, "cover");
    if (cover && cover.size > MAX_COVER_BYTES) {
      return badRequest("封面图不能超过 20MB");
    }

    // 上传流直落临时文件，全程不整包驻留内存；yauzl 按需解压
    tmpZip = await saveToTempFile(zipFile, "mybook-comic-");

    let pageCount: number;
    try {
      pageCount = await countComicPages(tmpZip);
    } catch {
      return badRequest("压缩包已损坏或不是有效的 zip 文件");
    }
    if (pageCount === 0) {
      return badRequest(
        "压缩包里没有找到图片（支持 jpg/png/webp/gif/avif/svg）"
      );
    }

    const comic = await db.comic.create({
      data: {
        title,
        author: str(form, "author"),
        description: str(form, "description"),
        category: str(form, "category", "未分类"),
      },
    });

    // 流式解包落盘 + 页记录批量插入：任一环节失败回滚文件与记录，不留半成品
    const rows: { comicId: number; pageIndex: number; path: string }[] = [];
    try {
      await forEachComicPage(tmpZip, async (i, name, stream) => {
        const rel = `comics/${comic.id}/${String(i + 1).padStart(4, "0")}${extOf(name)}`;
        await pipeline(
          stream,
          createWriteStream(await ensureParentDir(resolveSafe(rel)))
        );
        rows.push({ comicId: comic.id, pageIndex: i, path: rel });
      });
      await db.comicPage.createMany({ data: rows });
    } catch (err) {
      await removeDir(`comics/${comic.id}`);
      await db.comic.delete({ where: { id: comic.id } }).catch(() => {});
      throw err;
    }

    let coverPath: string | null = rows[0]?.path ?? null;
    if (cover && IMAGE_EXTS.includes(extOf(cover.name))) {
      coverPath = await saveBuffer(
        Buffer.from(await cover.arrayBuffer()),
        `comics/covers/${randomName(extOf(cover.name))}`
      );
    }

    const updated = await db.comic.update({
      where: { id: comic.id },
      data: { coverPath },
      include: { _count: { select: { pages: true } } },
    });
    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    return serverError(err);
  } finally {
    if (tmpZip) {
      await fs
        .rm(path.dirname(tmpZip), { recursive: true, force: true })
        .catch(() => {});
    }
  }
}
