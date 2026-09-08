import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonError, serverError } from "@/lib/api";

export async function GET() {
  try {
    const games = await db.game.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    return NextResponse.json(games);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return jsonError("请先登录后台", 401);
  try {
    const body = await req.json().catch(() => ({}));
    const title = String(body.title || "").trim();
    const url = String(body.url || "").trim();
    if (!title) return jsonError("游戏名不能为空");
    if (!/^https?:\/\//i.test(url)) return jsonError("游戏地址需要以 http(s):// 开头");

    const maxOrder = await db.game.aggregate({ _max: { sortOrder: true } });
    const game = await db.game.create({
      data: {
        title,
        url,
        description: String(body.description || "").trim(),
        icon: String(body.icon || "🎮").trim().slice(0, 4) || "🎮",
        slug: `ext-${Math.random().toString(36).slice(2, 10)}`,
        builtin: false,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
    return NextResponse.json(game, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
