import { SignJWT, jwtVerify } from "jose";

/**
 * 默认密钥（仅限开发）。生产环境若沿用这些公开值，
 * 任何人都能伪造 admin 会话——bootstrap 启动时会检测并警告。
 */
export const DEFAULT_JWT_SECRETS = [
  "mybook-dw-dev-secret-change-me",
  "change-me-to-a-long-random-string",
];

export function isDefaultJwtSecret(secret: string | undefined): boolean {
  return !secret || DEFAULT_JWT_SECRETS.includes(secret);
}

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || DEFAULT_JWT_SECRETS[0]
);

export const SESSION_COOKIE = "mbw_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

export interface SessionPayload {
  uid: number;
  username: string;
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ uid: payload.uid, username: payload.username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.uid !== "number" || typeof payload.username !== "string") {
      return null;
    }
    return { uid: payload.uid, username: payload.username };
  } catch {
    return null;
  }
}
