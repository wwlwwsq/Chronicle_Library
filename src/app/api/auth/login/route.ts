import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { setSessionCookie } from "@/lib/auth";

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
    await setSessionCookie({ uid: admin.id, username: admin.username });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "登录失败，请稍后再试" }, { status: 500 });
  }
}
