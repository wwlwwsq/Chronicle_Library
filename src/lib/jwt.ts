import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "mybook-dw-dev-secret-change-me"
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
