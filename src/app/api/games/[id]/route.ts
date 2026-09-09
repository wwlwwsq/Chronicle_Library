import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonError, serverError, toId } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** 公开读取单个游戏（外部游戏 iframe 页用） */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const id = toId((await params).id);
    if (!id) return jsonError("游戏不存在", 404);
    const game = await db.game.findUnique({ where: { id } });
    if (!game) return jsonError("游戏不存在", 404);
    return NextResponse.json(game);
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return jsonError("请先登录后台", 401);
  try {
    const id = toId((await params).id);
    if (!id) return jsonError("游戏不存在", 404);
    const game = await db.game.findUnique({ where: { id } });
    if (!game) return jsonError("游戏不存在", 404);

    const body = await req.json().catch(() => ({}));
    if (game.url && body.url !== undefined && !/^https?:\/\//i.test(String(body.url))) {
      return jsonError("游戏地址需要以 http(s):// 开头");
    }
    const updated = await db.game.update({
      where: { id: game.id },
      data: {
        title: String(body.title ?? game.title).trim() || game.title,
        description: String(body.description ?? game.description).trim(),
        url: body.url !== undefined ? String(body.url).trim() : game.url,
        icon: String(body.icon ?? game.icon).trim().slice(0, 4) || "🎮",
        sortOrder:
          body.sortOrder !== undefined ? Number(body.sortOrder) || 0 : game.sortOrder,
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
    if (!id) return jsonError("游戏不存在", 404);
    const game = await db.game.findUnique({ where: { id } });
    if (!game) return jsonError("游戏不存在", 404);
    if (game.builtin) return jsonError("内置游戏不能删除");
    await db.game.delete({ where: { id: game.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
