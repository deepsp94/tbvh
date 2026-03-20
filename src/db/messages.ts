import { v4 as uuidv4 } from "uuid";
import { getDb } from "./index.js";
import type { Message } from "@shared/types.js";

export function insertMessage(
  instanceId: string,
  role: "seller" | "buyer",
  content: string,
  turn: number
): Message {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO messages (id, instance_id, role, content, turn, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, instanceId, role, content, turn, now);
  return db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as Message;
}

export function getMessages(instanceId: string): Message[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM messages WHERE instance_id = ? ORDER BY turn ASC, created_at ASC")
    .all(instanceId) as Message[];
}
