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
