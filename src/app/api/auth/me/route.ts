import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { serverError } from "@/lib/api";

/** 当前登录态查询：桌面应用与网页共用的会话探测端点 */
export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    return NextResponse.json({
      uid: session.uid,
      username: session.username,
    });
  } catch (err) {
    return serverError(err);
  }
}
