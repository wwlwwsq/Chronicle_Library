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
  toId,
} from "@/lib/api";
import {
  IMAGE_EXTS,
  ensureParentDir,
  extOf,
  randomName,
  removeDir,
  removeFile,
  resolveSafe,
  saveBuffer,
  saveToTempFile,
} from "@/lib/storage";
import { countComicPages, forEachComicPage } from "@/lib/comic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const id = toId((await params).id);
    if (!id) return jsonError("漫画不存在", 404);
    const comic = await db.comic.findUnique({
      where: { id },
      include: { pages: { orderBy: { pageIndex: "asc" } } },
    });
    if (!comic) return jsonError("漫画不存在", 404);
    return NextResponse.json(comic);
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return jsonError("请先登录后台", 401);
  let tmpZip: string | null = null;
  try {
    const comicId = toId((await params).id);
    if (!comicId) return jsonError("漫画不存在", 404);
    const comic = await db.comic.findUnique({ where: { id: comicId } });
    if (!comic) return jsonError("漫画不存在", 404);

    const form = await req.formData();
    const data: Record<string, unknown> = {
      title: str(form, "title", comic.title),
      author: str(form, "author", comic.author),
      description: str(form, "description", comic.description),
      category: str(form, "category", comic.category),
    };

    // 可选：上传新的 zip 替换全部漫画页
    const zipFile = fileOf(form, "file");
    if (zipFile) {
      if (!zipFile.name.toLowerCase().endsWith(".zip")) {
        return badRequest("漫画文件需要是 .zip 压缩包");
      }
      if (zipFile.size > MAX_UPLOAD_BYTES) {
        return badRequest("压缩包太大，上限 512MB");
      }
      tmpZip = await saveToTempFile(zipFile, "mybook-comic-");

      let pageCount: number;
      try {
        pageCount = await countComicPages(tmpZip);
      } catch {
        return badRequest("压缩包已损坏或不是有效的 zip 文件");
      }
      if (pageCount === 0) return badRequest("压缩包里没有找到图片");

      // 新页先流式解到暂存目录，全部成功才动旧数据；中途失败旧页原封不动
      const staging = `comics/.staging-${comicId}-${Date.now()}`;
      const rows: { comicId: number; pageIndex: number; path: string }[] = [];
      try {
        await forEachComicPage(tmpZip, async (i, name, stream) => {
          const fileName = `${String(i + 1).padStart(4, "0")}${extOf(name)}`;
          await pipeline(
            stream,
            createWriteStream(
              await ensureParentDir(resolveSafe(`${staging}/${fileName}`))
            )
          );
          rows.push({
            comicId,
            pageIndex: i,
            path: `comics/${comicId}/${fileName}`,
          });
        });
      } catch (err) {
        await removeDir(staging);
        throw err;
      }

      await removeDir(`comics/${comicId}`);
      await fs.rename(resolveSafe(staging), resolveSafe(`comics/${comicId}`));
      try {
        await db.$transaction([
          db.comicPage.deleteMany({ where: { comicId } }),
          db.comicPage.createMany({ data: rows }),
        ]);
      } catch (err) {
        // 记录替换失败时清掉已换入的文件，避免出现无记录指向的孤儿页
        await removeDir(`comics/${comicId}`);
        throw err;
      }

      // 新图片解压后，旧封面若指向被删目录则回退为第一页
      if (comic.coverPath?.startsWith(`comics/${comicId}/`)) {
        data.coverPath = rows[0]?.path ?? null;
      }
    }

    const cover = fileOf(form, "cover");
    if (cover) {
      if (cover.size > MAX_COVER_BYTES) {
        return badRequest("封面图不能超过 20MB");
      }
      if (IMAGE_EXTS.includes(extOf(cover.name))) {
        const coverPath = await saveBuffer(
          Buffer.from(await cover.arrayBuffer()),
          `comics/covers/${randomName(extOf(cover.name))}`
        );
        if (
          comic.coverPath &&
          !comic.coverPath.startsWith(`comics/${comicId}/`)
        ) {
          await removeFile(comic.coverPath);
        }
        data.coverPath = coverPath;
      }
    }

    const updated = await db.comic.update({
      where: { id: comicId },
      data,
      include: { _count: { select: { pages: true } } },
    });
    return NextResponse.json(updated);
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

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return jsonError("请先登录后台", 401);
  try {
    const comicId = toId((await params).id);
    if (!comicId) return jsonError("漫画不存在", 404);
    const comic = await db.comic.findUnique({ where: { id: comicId } });
    if (!comic) return jsonError("漫画不存在", 404);
    await removeDir(`comics/${comicId}`);
    if (comic.coverPath && !comic.coverPath.startsWith(`comics/${comicId}/`)) {
      await removeFile(comic.coverPath);
    }
    await db.comic.delete({ where: { id: comicId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
