import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, serverError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";

/** 后台仪表盘聚合数据（管理员）：各内容计数与最近记录 */
export async function GET() {
  const session = await requireAdmin();
  if (!session) return jsonError("请先登录后台", 401);
  try {
    const [bookCount, comicCount, postCount, gameCount, poemCount] =
      await Promise.all([
        db.book.count(),
        db.comic.count(),
        db.post.count(),
        db.game.count(),
        db.poem.count(),
      ]);
    const [recentBooks, recentPosts] = await Promise.all([
      db.book.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      db.post.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }),
    ]);
    return NextResponse.json({
      counts: {
        books: bookCount,
        comics: comicCount,
        posts: postCount,
        games: gameCount,
        poems: poemCount,
      },
      recentBooks,
      recentPosts,
    });
  } catch (err) {
    return serverError(err);
  }
}
