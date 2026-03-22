import { v4 as uuidv4 } from "uuid";
import { getDb } from "./index.js";
import type { Negotiation, CommitNegotiationInput } from "@shared/types.js";

export interface CreateNegotiationOpts extends CommitNegotiationInput {
  email_domain?: string;
  email_subject?: string;
  email_body?: string;
  email_verified?: boolean;
}

export function createNegotiation(
  instanceId: string,
  sellerAddress: string,
  opts: CreateNegotiationOpts
): Negotiation {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  const proofType = opts.proof_type ?? "text";

  db.prepare(`
    INSERT INTO negotiations (
      id, instance_id, seller_address, seller_info, seller_proof, seller_prompt,
      proof_type, email_domain, email_subject, email_body, email_verified,
      status, committed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'committed', ?)
  `).run(
    id, instanceId, sellerAddress.toLowerCase(),
    opts.seller_info, opts.seller_proof ?? null, opts.seller_prompt ?? null,
    proofType,
    opts.email_domain ?? null, opts.email_subject ?? null, opts.email_body ?? null,
    opts.email_verified ? 1 : 0,
    now
  );

  return getNegotiationById(id) as Negotiation;
}

export function getNegotiationById(id: string): Negotiation | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM negotiations WHERE id = ?")
    .get(id) as Negotiation | undefined;
}

export function getNegotiationsByInstance(instanceId: string): Negotiation[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM negotiations WHERE instance_id = ? ORDER BY committed_at DESC")
    .all(instanceId) as Negotiation[];
}

export function getNegotiationsBySeller(address: string): Negotiation[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM negotiations WHERE seller_address = ? ORDER BY committed_at DESC")
    .all(address) as Negotiation[];
}

export function hasActiveNegotiation(instanceId: string, sellerAddress: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT 1 FROM negotiations WHERE instance_id = ? AND seller_address = ? AND status IN ('committed', 'running', 'proposed') LIMIT 1")
    .get(instanceId, sellerAddress.toLowerCase());
  return !!row;
}

export function hasAcceptedNegotiation(instanceId: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT 1 FROM negotiations WHERE instance_id = ? AND status = 'accepted' LIMIT 1")
    .get(instanceId);
  return !!row;
}

export function setRunning(id: string): { success: boolean; negotiation?: Negotiation } {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .prepare("UPDATE negotiations SET status = 'running', started_at = ? WHERE id = ? AND status = 'committed'")
    .run(now, id);
  if (result.changes === 0) return { success: false };
  return { success: true, negotiation: getNegotiationById(id) };
}

export function setProposed(id: string, askingPrice: number): Negotiation | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  // Clear ephemeral email content on terminal state
  db.prepare(`
    UPDATE negotiations SET status = 'proposed', asking_price = ?, completed_at = ?,
    email_subject = NULL, email_body = NULL WHERE id = ?
  `).run(askingPrice, now, id);
  return getNegotiationById(id);
}

export function setAccepted(id: string): Negotiation | undefined {
  const db = getDb();
  db.prepare("UPDATE negotiations SET status = 'accepted' WHERE id = ? AND status = 'proposed'").run(id);
  return getNegotiationById(id);
}

export function setRejected(id: string, reasoning: string): Negotiation | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE negotiations SET status = 'rejected', outcome_reasoning = ?, completed_at = ?,
    seller_info = NULL, seller_proof = NULL, email_subject = NULL, email_body = NULL WHERE id = ?
  `).run(reasoning, now, id);
  return getNegotiationById(id);
}

export function setCancelled(id: string): Negotiation | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE negotiations SET status = 'cancelled', completed_at = ?,
    email_subject = NULL, email_body = NULL WHERE id = ?
  `).run(now, id);
  return getNegotiationById(id);
}

export function setFailed(id: string, reason: string): Negotiation | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE negotiations SET status = 'failed', outcome_reasoning = ?, completed_at = ?,
    seller_info = NULL, seller_proof = NULL, email_subject = NULL, email_body = NULL WHERE id = ?
  `).run(reason, now, id);
  return getNegotiationById(id);
}

export function setAskingPrice(id: string, price: number): void {
  const db = getDb();
  db.prepare("UPDATE negotiations SET asking_price = ? WHERE id = ?").run(price, id);
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
    UPDATE negotiations
    SET outcome_signature = ?, outcome_signer = ?, outcome_signed_at = ?, tee_attested = ?
    WHERE id = ?
  `).run(signature, signerAddress, now, teeAttested ? 1 : 0, id);
}
