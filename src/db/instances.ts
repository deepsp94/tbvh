import { v4 as uuidv4 } from "uuid";
import { getDb } from "./index.js";
import { config } from "../config.js";
import type { Instance, CreateInstanceInput } from "@shared/types.js";

export function createInstance(
  input: CreateInstanceInput,
  buyerAddress: string
): Instance {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  const model = input.model ?? config.defaultModel;
  const max_turns = input.max_turns ?? config.maxTurns;

  db.prepare(`
    INSERT INTO instances (id, status, buyer_address, buyer_requirement, buyer_prompt, max_payment, model, max_turns, created_at)
    VALUES (?, 'open', ?, ?, ?, ?, ?, ?, ?)
  `).run(id, buyerAddress.toLowerCase(), input.buyer_requirement, input.buyer_prompt ?? null, input.max_payment, model, max_turns, now);

  return getInstanceById(id) as Instance;
}

export function getInstanceById(id: string): Instance | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM instances WHERE id = ?")
    .get(id) as Instance | undefined;
}

export function closeInstance(id: string): Instance | undefined {
  const db = getDb();
  db.prepare("UPDATE instances SET status = 'closed' WHERE id = ? AND status = 'open'").run(id);
  return getInstanceById(id);
}

export function deleteInstance(id: string): void {
  const db = getDb();
  // Cascade: delete events, messages, negotiations, then instance
  const negIds = db.prepare("SELECT id FROM negotiations WHERE instance_id = ?").all(id) as { id: string }[];
  for (const neg of negIds) {
    db.prepare("DELETE FROM negotiation_events WHERE negotiation_id = ?").run(neg.id);
    db.prepare("DELETE FROM messages WHERE negotiation_id = ?").run(neg.id);
  }
  db.prepare("DELETE FROM negotiations WHERE instance_id = ?").run(id);
  db.prepare("DELETE FROM instances WHERE id = ?").run(id);
}

export function getInstancesByBuyer(address: string): Instance[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM instances WHERE buyer_address = ? ORDER BY created_at DESC")
    .all(address) as Instance[];
}

export function listInstances(status?: string): Instance[] {
  const db = getDb();
  if (status) {
    return db
      .prepare("SELECT * FROM instances WHERE status = ? ORDER BY created_at DESC")
      .all(status) as Instance[];
  }
  return db
    .prepare("SELECT * FROM instances ORDER BY created_at DESC")
    .all() as Instance[];
}
