import { getDb } from "../db/index.js";
import { config } from "../config.js";
import { randomBytes } from "crypto";
import type { Nonce } from "../types.js";

export function generateNonce(address: string): { nonce: string; expiresAt: string } {
  const db = getDb();
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + config.nonceExpiresMs).toISOString();

  db.prepare(`
    INSERT INTO nonces (nonce, address, expires_at, used)
    VALUES (?, ?, ?, 0)
  `).run(nonce, address.toLowerCase(), expiresAt);

  return { nonce, expiresAt };
}

export function validateNonce(nonce: string, address: string): boolean {
  const db = getDb();

  // Get the nonce
  const row = db.prepare(`
    SELECT * FROM nonces WHERE nonce = ? AND address = ? AND used = 0
  `).get(nonce, address.toLowerCase()) as Nonce | undefined;

  if (!row) {
    return false;
  }

  // Check if expired
  if (new Date(row.expires_at) < new Date()) {
    return false;
  }

  // Mark as used (single-use)
  db.prepare("UPDATE nonces SET used = 1 WHERE nonce = ?").run(nonce);

  return true;
}

export function cleanupExpiredNonces(): number {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db.prepare(`
    DELETE FROM nonces WHERE expires_at < ? OR used = 1
  `).run(now);

  return result.changes;
}
