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
} from "@/lib/api";
import { IMAGE_EXTS, extOf, randomName, saveBuffer } from "@/lib/storage";
import { extractComicEntries } from "@/lib/comic";

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

    const buf = Buffer.from(await zipFile.arrayBuffer());
    const entries = extractComicEntries(buf);
    if (entries.length === 0) {
      return badRequest("压缩包里没有找到图片（支持 jpg/png/webp/gif/avif）");
    }

    const comic = await db.comic.create({
      data: {
        title,
        author: str(form, "author"),
        description: str(form, "description"),
        category: str(form, "category", "未分类"),
      },
    });

    let firstPage: string | null = null;
    for (let i = 0; i < entries.length; i++) {
      const ext = extOf(entries[i].name);
      const rel = `comics/${comic.id}/${String(i + 1).padStart(4, "0")}${ext}`;
      await saveBuffer(entries[i].data, rel);
      if (i === 0) firstPage = rel;
      await db.comicPage.create({
        data: { comicId: comic.id, pageIndex: i, path: rel },
      });
    }

    let coverPath: string | null = firstPage;
    const cover = fileOf(form, "cover");
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
  }
}
