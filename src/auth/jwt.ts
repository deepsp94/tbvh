import { SignJWT, jwtVerify } from "jose";
import { config } from "../config.js";
import type { JWTPayload } from "@shared/types.js";

const secret = Buffer.from(config.jwtSecret, "hex");

export async function createToken(
  address: string
): Promise<{ token: string; expiresAt: string }> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + parseExpiry(config.jwtExpiresIn);
  const expiresAt = new Date(exp * 1000).toISOString();

  const token = await new SignJWT({ sub: address.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret);

  return { token, expiresAt };
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JWTPayload;
}

function parseExpiry(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) return 86400; // default 24h
  const num = Number(match[1]);
  switch (match[2]) {
    case "s":
      return num;
    case "m":
      return num * 60;
    case "h":
      return num * 3600;
    case "d":
      return num * 86400;
    default:
      return 86400;
  }
}
