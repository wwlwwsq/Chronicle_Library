import { NextRequest, NextResponse } from "next/server";
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
import { BOOK_EXTS, extOf, randomName, saveWebFile } from "@/lib/storage";

export async function GET() {
  try {
    const books = await db.book.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(books);
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
    const file = fileOf(form, "file");
    if (!title) return badRequest("书名不能为空");
    if (!file) return badRequest("请选择书籍文件（.epub 或 .txt）");
    if (file.size > MAX_UPLOAD_BYTES) {
      return badRequest("文件太大，单个文件上限 512MB");
    }

    const ext = extOf(file.name);
    if (!BOOK_EXTS.includes(ext)) return badRequest("仅支持 .epub 或 .txt 文件");
    const format = ext.slice(1);

    const cover = fileOf(form, "cover");
    if (cover && cover.size > MAX_COVER_BYTES) {
      return badRequest("封面图不能超过 20MB");
    }

    const book = await db.book.create({
      data: {
        title,
        author: str(form, "author"),
        description: str(form, "description"),
        category: str(form, "category", "未分类"),
        format,
        filePath: "",
        fileSize: file.size,
      },
    });

    // 流式写盘：512MB 的书不再整体驻留内存；写盘失败回滚 DB 记录
    let filePath: string;
    try {
      filePath = await saveWebFile(file, `books/${book.id}-${randomName(ext)}`);
    } catch (err) {
      await db.book.delete({ where: { id: book.id } }).catch(() => {});
      throw err;
    }

    let coverPath: string | null = null;
    if (cover && cover.type.startsWith("image/")) {
      coverPath = await saveWebFile(
        cover,
        `books/covers/${randomName(extOf(cover.name))}`
      );
    }

    const updated = await db.book.update({
      where: { id: book.id },
      data: { filePath, coverPath },
    });
    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
