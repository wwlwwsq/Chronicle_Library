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
import { extOf, randomName, saveBuffer } from "@/lib/storage";

export async function GET(req: NextRequest) {
  try {
    const dynasty = req.nextUrl.searchParams.get("dynasty") || "";
    const style = req.nextUrl.searchParams.get("style") || "";
    const poems = await db.poem.findMany({
      where: {
        ...(dynasty ? { dynasty } : {}),
        ...(style ? { style } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(poems);
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

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return jsonError("请先登录后台", 401);
  try {
    const form = await req.formData();
    const title = str(form, "title");
    const content = str(form, "content");
    if (!title) return badRequest("诗题不能为空");
    if (!content) return badRequest("诗文内容不能为空");

    const poster = fileOf(form, "poster");
    const comic = fileOf(form, "comic");

    let posterPath: string | undefined;
    if (poster) {
      const r = await savePoemImage(poster, "posters");
      if (r.error) return r.error;
      posterPath = r.path;
    }
    let comicPath: string | undefined;
    if (comic) {
      const r = await savePoemImage(comic, "comics");
      if (r.error) return r.error;
      comicPath = r.path;
    }

    const poem = await db.poem.create({
      data: {
        title,
        author: str(form, "author"),
        dynasty: str(form, "dynasty", "唐"),
        style: str(form, "style", "未分类"),
        content,
        note: str(form, "note"),
        ...(posterPath ? { posterPath } : {}),
        ...(comicPath ? { comicPath } : {}),
      },
    });
    return NextResponse.json(poem, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
