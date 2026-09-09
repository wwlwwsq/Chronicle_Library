import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonError, serverError, toId } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** 公开读取：数字 id 或 slug 均可；未发布草稿仅管理员可见（404 兜底，不泄露存在性） */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const seg = decodeURIComponent((await params).id);
    const id = toId(seg);
    const post = id
      ? await db.post.findUnique({ where: { id } })
      : await db.post.findUnique({ where: { slug: seg } });
    if (!post) return jsonError("文章不存在", 404);
    if (!post.published) {
      const session = await requireAdmin();
      if (!session) return jsonError("文章不存在", 404);
    }
    return NextResponse.json(post);
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return jsonError("请先登录后台", 401);
  try {
    const id = toId((await params).id);
    if (!id) return jsonError("文章不存在", 404);
    const post = await db.post.findUnique({ where: { id } });
    if (!post) return jsonError("文章不存在", 404);

    const body = await req.json().catch(() => ({}));
    const updated = await db.post.update({
      where: { id: post.id },
      data: {
        title: String(body.title ?? post.title).trim() || post.title,
        summary: String(body.summary ?? post.summary).trim(),
        content: String(body.content ?? post.content),
        tags: String(body.tags ?? post.tags).trim(),
        published:
          typeof body.published === "boolean" ? body.published : post.published,
      },
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
    const id = toId((await params).id);
    if (!id) return jsonError("文章不存在", 404);
    const post = await db.post.findUnique({ where: { id } });
    if (!post) return jsonError("文章不存在", 404);
    await db.post.delete({ where: { id: post.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
