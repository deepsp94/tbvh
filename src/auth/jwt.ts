import * as jose from "jose";
import { config } from "../config.js";
import type { JWTPayload } from "../types.js";

const secret = new TextEncoder().encode(config.jwtSecret);

export async function createToken(address: string): Promise<{ token: string; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const token = await new jose.SignJWT({ sub: address.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);

  return { token, expiresAt: expiresAt.toISOString() };
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secret);
    return {
      sub: payload.sub as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}
