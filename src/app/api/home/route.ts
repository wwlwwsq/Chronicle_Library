import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serverError } from "@/lib/api";

/**
 * 首页聚合数据（公开）：一次请求带齐统计与各板块的最新内容，
 * 供客户端渲染的首页使用（桌面模式前端在本地，逐个拉接口太碎）。
 */
export async function GET() {
  try {
    const [bookCount, comicCount, postCount, gameCount, poemCount] =
      await Promise.all([
        db.book.count(),
        db.comic.count(),
        db.post.count({ where: { published: true } }),
        db.game.count(),
        db.poem.count(),
      ]);
    const [books, comics, posts, games, poems] = await Promise.all([
      db.book.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      db.comic.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { _count: { select: { pages: true } } },
      }),
      db.post.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      db.game.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 6 }),
      db.poem.findMany({ orderBy: { createdAt: "desc" }, take: 3 }),
    ]);
    return NextResponse.json({
      counts: {
        books: bookCount,
        comics: comicCount,
        posts: postCount,
        games: gameCount,
        poems: poemCount,
      },
      books,
      comics,
      posts,
      games,
      poems,
    });
  } catch (err) {
    return serverError(err);
  }
}
