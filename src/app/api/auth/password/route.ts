import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth";
import { jsonError, serverError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return jsonError("请先登录", 401);

    const body = await req.json().catch(() => ({}));
    const oldPassword = String(body.oldPassword || "");
    const newPassword = String(body.newPassword || "");
    if (newPassword.length < 6) {
      return jsonError("新密码至少需要 6 位");
    }

    const admin = await db.admin.findUnique({ where: { id: session.uid } });
    if (!admin || !bcrypt.compareSync(oldPassword, admin.passwordHash)) {
      return jsonError("原密码不正确");
    }

    await db.admin.update({
      where: { id: admin.id },
      data: { passwordHash: bcrypt.hashSync(newPassword, 10) },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
