export interface NonceResponse {
  nonce: string;
  expiresAt: string;
}

export interface VerifyResponse {
  token: string;
  address: string;
  expiresAt: string;
}

export interface JWTPayload {
  sub: string;
  iat: number;
  exp: number;
}

export type InstanceStatus =
  | "created"
  | "committed"
  | "running"
  | "completed"
  | "failed";

export interface Instance {
  id: string;
  status: InstanceStatus;
  buyer_address: string;
  buyer_requirement: string;
  buyer_prompt: string | null;
  max_payment: number;
  seller_address: string | null;
  seller_info: string | null;
  seller_proof: string | null;
  seller_prompt: string | null;
  model: string;
  max_turns: number;
  outcome: "ACCEPT" | "REJECT" | null;
  final_price: number | null;
  outcome_reasoning: string | null;
  outcome_signature: string | null;
  outcome_signer: string | null;
  outcome_signed_at: string | null;
  tee_attested: number;
  created_at: string;
  committed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface CreateInstanceInput {
  buyer_requirement: string;
  buyer_prompt?: string;
  max_payment: number;
  model?: string;
  max_turns?: number;
}
