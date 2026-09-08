import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { badRequest, jsonError, serverError } from "@/lib/api";
import { slugify } from "@/lib/site";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const all = req.nextUrl.searchParams.get("all") === "1" && !!session;
    const posts = await db.post.findMany({
      where: all ? {} : { published: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        tags: true,
        published: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(posts);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return badRequest("请先登录后台");
  try {
    const body = await req.json().catch(() => ({}));
    const title = String(body.title || "").trim();
    const content = String(body.content || "");
    if (!title) return jsonError("标题不能为空");
    if (!content.trim()) return jsonError("正文不能为空");

    const post = await db.post.create({
      data: {
        title,
        slug: slugify(title),
        summary: String(body.summary || "").trim(),
        content,
        tags: String(body.tags || "").trim(),
        published: Boolean(body.published),
      },
    });
    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
