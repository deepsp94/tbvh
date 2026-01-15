import { getDb } from "./index.js";
import { v4 as uuidv4 } from "uuid";
import type { Instance, InstanceStatus, CreateInstanceInput, CommitInstanceInput } from "../types.js";

export function createInstance(input: CreateInstanceInput, buyerAddress: string): Instance {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO instances (id, buyer_address, buyer_requirement, buyer_prompt, max_payment, model, max_turns, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    buyerAddress,
    input.buyer_requirement,
    input.buyer_prompt || null,
    input.max_payment,
    input.model || "deepseek/deepseek-chat-v3-0324",
    input.max_turns || 10,
    now
  );

  return getInstance(id)!;
}

export function getInstance(id: string): Instance | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM instances WHERE id = ?").get(id) as Instance | undefined;
  return row || null;
}

export function listInstances(status?: InstanceStatus): Instance[] {
  const db = getDb();
  if (status) {
    return db.prepare("SELECT * FROM instances WHERE status = ? ORDER BY created_at DESC").all(status) as Instance[];
  }
  return db.prepare("SELECT * FROM instances ORDER BY created_at DESC").all() as Instance[];
}

export function listInstancesByAddress(address: string): { asBuyer: Instance[]; asSeller: Instance[] } {
  const db = getDb();
  const asBuyer = db.prepare("SELECT * FROM instances WHERE buyer_address = ? ORDER BY created_at DESC").all(address) as Instance[];
  const asSeller = db.prepare("SELECT * FROM instances WHERE seller_address = ? ORDER BY created_at DESC").all(address) as Instance[];
  return { asBuyer, asSeller };
}

export function commitInstance(id: string, input: CommitInstanceInput, sellerAddress: string): Instance | null {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db.prepare(`
    UPDATE instances
    SET seller_address = ?, seller_info = ?, seller_proof = ?, seller_prompt = ?, status = 'committed', committed_at = ?
    WHERE id = ? AND status = 'created' AND buyer_address != ?
  `).run(
    sellerAddress,
    input.seller_info,
    input.seller_proof,
    input.seller_prompt || null,
    now,
    id,
    sellerAddress // Can't commit to your own instance
  );

  if (result.changes === 0) {
    return null;
  }

  return getInstance(id);
}

export function startInstance(id: string, buyerAddress: string): Instance | null {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db.prepare(`
    UPDATE instances
    SET status = 'running', started_at = ?
    WHERE id = ? AND status = 'committed' AND buyer_address = ?
  `).run(now, id, buyerAddress);

  if (result.changes === 0) {
    return null;
  }

  return getInstance(id);
}

export function completeInstance(
  id: string,
  outcome: "ACCEPT" | "REJECT",
  finalPrice: number | null,
  reasoning: string
): Instance | null {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db.prepare(`
    UPDATE instances
    SET status = 'completed', outcome = ?, final_price = ?, outcome_reasoning = ?, completed_at = ?
    WHERE id = ? AND status = 'running'
  `).run(outcome, finalPrice, reasoning, now, id);

  if (result.changes === 0) {
    return null;
  }

  // If rejected, delete seller_info to preserve confidentiality
  if (outcome === "REJECT") {
    db.prepare(`
      UPDATE instances
      SET seller_info = NULL, seller_proof = NULL
      WHERE id = ?
    `).run(id);
  }

  return getInstance(id);
}

export function failInstance(id: string, reason: string): Instance | null {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db.prepare(`
    UPDATE instances
    SET status = 'failed', outcome_reasoning = ?, completed_at = ?
    WHERE id = ? AND status = 'running'
  `).run(reason, now, id);

  if (result.changes === 0) {
    return null;
  }

  // Delete seller_info on failure too
  db.prepare(`
    UPDATE instances
    SET seller_info = NULL, seller_proof = NULL
    WHERE id = ?
  `).run(id);

  return getInstance(id);
}

export function deleteInstance(id: string, buyerAddress: string): boolean {
  const db = getDb();

  const result = db.prepare(`
    DELETE FROM instances
    WHERE id = ? AND buyer_address = ? AND status = 'created'
  `).run(id, buyerAddress);

  return result.changes > 0;
}
