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
    INSERT INTO instances (
      id, status, buyer_address, buyer_requirement, buyer_prompt,
      max_payment, seller_address, seller_info, seller_proof, seller_prompt,
      model, max_turns, outcome, final_price, outcome_reasoning,
      outcome_signature, outcome_signer, outcome_signed_at, tee_attested,
      created_at, committed_at, started_at, completed_at
    ) VALUES (
      ?, 'created', ?, ?, ?,
      ?, NULL, NULL, NULL, NULL,
      ?, ?, NULL, NULL, NULL,
      NULL, NULL, NULL, 0,
      ?, NULL, NULL, NULL
    )
  `).run(
    id,
    buyerAddress.toLowerCase(),
    input.buyer_requirement,
    input.buyer_prompt ?? null,
    input.max_payment,
    model,
    max_turns,
    now
  );

  return getInstanceById(id) as Instance;
}

export function getInstanceById(id: string): Instance | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM instances WHERE id = ?")
    .get(id) as Instance | undefined;
}

export function commitInstance(
  id: string,
  sellerAddress: string,
  input: import("@shared/types.js").CommitInstanceInput
): Instance | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE instances
    SET status = 'committed', seller_address = ?, seller_info = ?,
        seller_proof = ?, seller_prompt = ?, committed_at = ?
    WHERE id = ?
  `).run(
    sellerAddress.toLowerCase(),
    input.seller_info,
    input.seller_proof,
    input.seller_prompt ?? null,
    now,
    id
  );
  return getInstanceById(id);
}

export function deleteInstance(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM instances WHERE id = ?").run(id);
}

export function getInstancesByBuyer(address: string): Instance[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM instances WHERE buyer_address = ? ORDER BY created_at DESC")
    .all(address) as Instance[];
}

export function getInstancesBySeller(address: string): Instance[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM instances WHERE seller_address = ? ORDER BY created_at DESC")
    .all(address) as Instance[];
}

export function setRunning(id: string): { success: boolean; instance?: Instance } {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .prepare("UPDATE instances SET status = 'running', started_at = ? WHERE id = ? AND status = 'committed'")
    .run(now, id);
  if (result.changes === 0) return { success: false };
  return { success: true, instance: getInstanceById(id) };
}

export function setCompleted(
  id: string,
  outcome: "ACCEPT" | "REJECT",
  finalPrice: number | null,
  reasoning: string
): Instance | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE instances
    SET status = 'completed', outcome = ?, final_price = ?,
        outcome_reasoning = ?, completed_at = ?
    WHERE id = ?
  `).run(outcome, finalPrice, reasoning, now, id);
  return getInstanceById(id);
}

export function setSignature(
  id: string,
  signature: string,
  signerAddress: string,
  teeAttested: boolean
): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE instances
    SET outcome_signature = ?, outcome_signer = ?,
        outcome_signed_at = ?, tee_attested = ?
    WHERE id = ?
  `).run(signature, signerAddress, now, teeAttested ? 1 : 0, id);
}

export function setFailed(id: string, reason: string): Instance | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE instances
    SET status = 'failed', outcome_reasoning = ?, completed_at = ?
    WHERE id = ?
  `).run(reason, now, id);
  return getInstanceById(id);
}
