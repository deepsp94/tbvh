import { getDb } from "./index.js";
import type { Message } from "../types.js";

export function saveMessage(
  instanceId: string,
  turn: number,
  agent: "buyer" | "seller",
  content: string
): Message {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO messages (instance_id, turn, agent, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(instanceId, turn, agent, content, now);

  return {
    id: Number(result.lastInsertRowid),
    instance_id: instanceId,
    turn,
    agent,
    content,
    created_at: now,
  };
}

// Note: This function exists for internal TEE use only
// Messages are NEVER exposed via API to humans
export function getMessages(instanceId: string): Message[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM messages WHERE instance_id = ? ORDER BY turn ASC, id ASC")
    .all(instanceId) as Message[];
}

export function deleteMessages(instanceId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM messages WHERE instance_id = ?").run(instanceId);
}
