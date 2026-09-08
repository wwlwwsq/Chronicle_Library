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
  BOOK_EXTS,
  extOf,
  randomName,
  removeFile,
  saveBuffer,
} from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const id = toId((await params).id);
    if (!id) return jsonError("图书不存在", 404);
    const book = await db.book.findUnique({ where: { id } });
    if (!book) return jsonError("图书不存在", 404);
    return NextResponse.json(book);
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return jsonError("请先登录后台", 401);
  try {
    const id = toId((await params).id);
    if (!id) return jsonError("图书不存在", 404);
    const book = await db.book.findUnique({ where: { id } });
    if (!book) return jsonError("图书不存在", 404);

    const form = await req.formData();
    const data: Record<string, unknown> = {
      title: str(form, "title", book.title),
      author: str(form, "author", book.author),
      description: str(form, "description", book.description),
      category: str(form, "category", book.category),
    };

    const file = fileOf(form, "file");
    if (file) {
      const ext = extOf(file.name);
      if (!BOOK_EXTS.includes(ext)) return badRequest("仅支持 .epub 或 .txt 文件");
      if (file.size > MAX_UPLOAD_BYTES) {
        return badRequest("文件太大，单个文件上限 512MB");
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const filePath = await saveBuffer(buf, `books/${id}-${randomName(ext)}`);
      await removeFile(book.filePath);
      data.filePath = filePath;
      data.format = ext.slice(1);
      data.fileSize = buf.length;
    }

    const cover = fileOf(form, "cover");
    if (cover && cover.type.startsWith("image/")) {
      const coverPath = await saveBuffer(
        Buffer.from(await cover.arrayBuffer()),
        `books/covers/${randomName(extOf(cover.name))}`
      );
      await removeFile(book.coverPath);
      data.coverPath = coverPath;
    }

    const updated = await db.book.update({ where: { id }, data });
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
    if (!id) return jsonError("图书不存在", 404);
    const book = await db.book.findUnique({ where: { id } });
    if (!book) return jsonError("图书不存在", 404);
    await removeFile(book.filePath);
    await removeFile(book.coverPath);
    await db.book.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
