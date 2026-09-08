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
import { extOf, randomName, removeFile, saveBuffer } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const id = toId((await params).id);
    if (!id) return jsonError("诗词不存在", 404);
    const poem = await db.poem.findUnique({ where: { id } });
    if (!poem) return jsonError("诗词不存在", 404);
    return NextResponse.json(poem);
  } catch (err) {
    return serverError(err);
  }
}

/** 保存一张诗词配图，返回相对路径 */
async function savePoemImage(file: File, kind: "posters" | "comics") {
  if (!file.type.startsWith("image/")) {
    return { error: badRequest("配图仅支持图片文件") };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: badRequest("图片太大，单个文件上限 512MB") };
  }
  const path = await saveBuffer(
    Buffer.from(await file.arrayBuffer()),
    `poems/${kind}/${randomName(extOf(file.name))}`
  );
  return { path };
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return jsonError("请先登录后台", 401);
  try {
    const id = toId((await params).id);
    if (!id) return jsonError("诗词不存在", 404);
    const poem = await db.poem.findUnique({ where: { id } });
    if (!poem) return jsonError("诗词不存在", 404);

    const form = await req.formData();
    const data: Record<string, unknown> = {
      title: str(form, "title", poem.title),
      author: str(form, "author", poem.author),
      dynasty: str(form, "dynasty", poem.dynasty),
      style: str(form, "style", poem.style),
      content: str(form, "content", poem.content),
      note: str(form, "note", poem.note),
    };

    // 配图：传新图替换；posterClear/comicClear=1 表示移除
    const poster = fileOf(form, "poster");
    if (poster) {
      const r = await savePoemImage(poster, "posters");
      if (r.error) return r.error;
      await removeFile(poem.posterPath);
      data.posterPath = r.path;
    } else if (form.get("posterClear") === "1" && poem.posterPath) {
      await removeFile(poem.posterPath);
      data.posterPath = null;
    }

    const comic = fileOf(form, "comic");
    if (comic) {
      const r = await savePoemImage(comic, "comics");
      if (r.error) return r.error;
      await removeFile(poem.comicPath);
      data.comicPath = r.path;
    } else if (form.get("comicClear") === "1" && poem.comicPath) {
      await removeFile(poem.comicPath);
      data.comicPath = null;
    }

    const updated = await db.poem.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return jsonError("请先登录后台", 401);
  try {
    const id = toId((await params).id);
    if (!id) return jsonError("诗词不存在", 404);
    const poem = await db.poem.findUnique({ where: { id } });
    if (!poem) return jsonError("诗词不存在", 404);
    await removeFile(poem.posterPath);
    await removeFile(poem.comicPath);
    await db.poem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
