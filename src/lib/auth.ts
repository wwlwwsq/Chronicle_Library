import { cookies, headers } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./jwt";

export { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken };
export type { SessionPayload };

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // COOKIE_SECURE=true（HTTPS 反代）时用 none：桌面应用等跨站客户端才能携带
    sameSite: process.env.COOKIE_SECURE === "true" ? "none" : "lax",
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
}

/** 在 API 路由里使用：未登录返回 null，路由自行返回 401。
 *  支持两种凭据：cookie（网页同源）与 Authorization: Bearer（桌面/跨域客户端） */
export async function requireAdmin(): Promise<SessionPayload | null> {
  try {
    const auth = (await headers()).get("authorization");
    if (auth?.toLowerCase().startsWith("bearer ")) {
      const payload = await verifySessionToken(auth.slice(7).trim());
      if (payload) return payload;
    }
  } catch {
    // headers() 在部分上下文不可用，忽略后回退到 cookie
  }
  return getSession();
}
