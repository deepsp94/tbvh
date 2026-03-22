import { v4 as uuidv4 } from "uuid";
import { getDb } from "./index.js";
import type { Message } from "@shared/types.js";

export function insertMessage(
  negotiationId: string,
  role: "seller" | "buyer",
  content: string,
  turn: number
): Message {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO messages (id, negotiation_id, role, content, turn, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, negotiationId, role, content, turn, now);
  return db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as Message;
}

export function getMessages(negotiationId: string): Message[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM messages WHERE negotiation_id = ? ORDER BY turn ASC, created_at ASC")
    .all(negotiationId) as Message[];
}
