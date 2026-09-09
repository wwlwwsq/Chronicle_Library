import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { setSessionCookie, createSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || !password) {
      return NextResponse.json({ error: "请输入用户名和密码" }, { status: 400 });
    }
    const admin = await db.admin.findUnique({ where: { username } });
    if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
      return NextResponse.json({ error: "用户名或密码不正确" }, { status: 401 });
    }
    const payload = { uid: admin.id, username: admin.username };
    await setSessionCookie(payload);
    // 同时返回 token：桌面应用等跨域客户端用它走 Authorization: Bearer
    const token = await createSessionToken(payload);
    return NextResponse.json({ ok: true, token });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "登录失败，请稍后再试" }, { status: 500 });
  }
}
