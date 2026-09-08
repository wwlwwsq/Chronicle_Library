import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
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
  extOf,
  randomName,
  removeDir,
  removeFile,
  saveBuffer,
} from "@/lib/storage";
import { extractComicEntries } from "@/lib/comic";

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
      const buf = Buffer.from(await zipFile.arrayBuffer());
      const entries = extractComicEntries(buf);
      if (entries.length === 0) return badRequest("压缩包里没有找到图片");

      await removeDir(`comics/${comicId}`);
      await db.comicPage.deleteMany({ where: { comicId } });
      let firstPage: string | null = null;
      for (let i = 0; i < entries.length; i++) {
        const rel = `comics/${comicId}/${String(i + 1).padStart(4, "0")}${extOf(entries[i].name)}`;
        await saveBuffer(entries[i].data, rel);
        if (i === 0) firstPage = rel;
        await db.comicPage.create({
          data: { comicId, pageIndex: i, path: rel },
        });
      }
      // 新图片解压后，旧封面若指向被删目录则回退为第一页
      if (comic.coverPath?.startsWith(`comics/${comicId}/`)) {
        data.coverPath = firstPage;
      }
    }

    const cover = fileOf(form, "cover");
    if (cover && IMAGE_EXTS.includes(extOf(cover.name))) {
      const coverPath = await saveBuffer(
        Buffer.from(await cover.arrayBuffer()),
        `comics/covers/${randomName(extOf(cover.name))}`
      );
      if (comic.coverPath && !comic.coverPath.startsWith(`comics/${comicId}/`)) {
        await removeFile(comic.coverPath);
      }
      data.coverPath = coverPath;
    }

    const updated = await db.comic.update({
      where: { id: comicId },
      data,
      include: { _count: { select: { pages: true } } },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return serverError(err);
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
