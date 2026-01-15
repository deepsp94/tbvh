// Instance types
export type InstanceStatus = "created" | "committed" | "running" | "completed" | "failed";

export interface Instance {
  id: string;
  status: InstanceStatus;

  // Buyer
  buyer_address: string;
  buyer_requirement: string;
  buyer_prompt: string | null;
  max_payment: number;

  // Seller
  seller_address: string | null;
  seller_info: string | null;
  seller_proof: string | null;
  seller_prompt: string | null;

  // Config
  model: string;
  max_turns: number;

  // Outcome
  outcome: "ACCEPT" | "REJECT" | null;
  final_price: number | null;
  outcome_reasoning: string | null;

  // Timestamps
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

export interface CommitInstanceInput {
  seller_info: string;
  seller_proof: string;
  seller_prompt?: string;
}

// Message types (internal to TEE)
export interface Message {
  id: number;
  instance_id: string;
  turn: number;
  agent: "buyer" | "seller";
  content: string;
  created_at: string;
}

// Nonce types
export interface Nonce {
  nonce: string;
  address: string;
  expires_at: string;
  used: number;
}

// Negotiation types (internal)
export interface NegotiationOutcome {
  decision: "ACCEPT" | "REJECT";
  price?: number;
  reasoning: string;
}

// SSE types for progress stream
export type ProgressEvent =
  | { type: "progress"; data: { turn: number; phase: string } }
  | { type: "complete"; data: { outcome: "ACCEPT" | "REJECT"; price?: number; reasoning: string } }
  | { type: "error"; data: { message: string } };

// API response types
export interface PublicInstanceView {
  id: string;
  status: InstanceStatus;
  buyer_requirement: string;
  max_payment: number;
  created_at: string;
}

export interface ParticipantInstanceView extends PublicInstanceView {
  buyer_address: string;
  seller_address: string | null;
  outcome: "ACCEPT" | "REJECT" | null;
  final_price: number | null;
  outcome_reasoning: string | null;
  // seller_info only included for buyer if outcome=ACCEPT
  seller_info?: string;
}

// JWT payload
export interface JWTPayload {
  sub: string; // Ethereum address
  iat: number;
  exp: number;
}
