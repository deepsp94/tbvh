import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import { SiweMessage } from "siwe";
import { getDb } from "../db/index.js";
import { config } from "../config.js";
import { createToken } from "./jwt.js";
import type { NonceResponse, VerifyResponse } from "@shared/types.js";

export const authRoutes = new Hono();

authRoutes.get("/nonce", (c) => {
  const address = c.req.query("address");
  if (!address) {
    return c.json({ error: "address query parameter required" }, 400);
  }

  const nonce = uuidv4();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const db = getDb();
  db.prepare(
    "INSERT INTO nonces (nonce, address, expires_at, used) VALUES (?, ?, ?, 0)"
  ).run(nonce, address.toLowerCase(), expiresAt);

  return c.json({ nonce, expiresAt } satisfies NonceResponse);
});

authRoutes.post("/verify", async (c) => {
  const body = await c.req.json<{ message: string; signature: string }>();
  if (!body.message || !body.signature) {
    return c.json({ error: "message and signature required" }, 400);
  }

  let siweMessage: SiweMessage;
  try {
    siweMessage = new SiweMessage(body.message);
  } catch {
    return c.json({ error: "Invalid SIWE message" }, 400);
  }

  const db = getDb();

  // Look up nonce
  const nonceRow = db
    .prepare("SELECT * FROM nonces WHERE nonce = ? AND used = 0")
    .get(siweMessage.nonce) as
    | { nonce: string; address: string; expires_at: string; used: number }
    | undefined;

  if (!nonceRow) {
    return c.json({ error: "Invalid or expired nonce" }, 401);
  }

  // Check expiry
  if (new Date(nonceRow.expires_at) < new Date()) {
    return c.json({ error: "Nonce expired" }, 401);
  }

  // Check domain
  if (siweMessage.domain !== config.siweDomain) {
    return c.json({ error: "Domain mismatch" }, 401);
  }

  // Verify signature
  try {
    await siweMessage.verify({ signature: body.signature });
  } catch {
    return c.json({ error: "Invalid signature" }, 401);
  }

  // Mark nonce used
  db.prepare("UPDATE nonces SET used = 1 WHERE nonce = ?").run(
    siweMessage.nonce
  );

  // Create JWT
  const { token, expiresAt } = await createToken(siweMessage.address);

  return c.json({
    token,
    address: siweMessage.address.toLowerCase(),
    expiresAt,
  } satisfies VerifyResponse);
});
