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

export type InstanceStatus = "open" | "closed";

export interface Instance {
  id: string;
  status: InstanceStatus;
  buyer_address: string;
  buyer_requirement_title: string;
  buyer_requirement: string;
  buyer_prompt: string | null;
  max_payment: number;
  model: string;
  max_turns: number;
  created_at: string;
}

export type NegotiationStatus =
  | "committed"
  | "running"
  | "proposed"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "failed";

export type ProofType = "text" | "email";

export interface Negotiation {
  id: string;
  instance_id: string;
  seller_address: string;
  seller_info: string | null;
  seller_proof: string | null;
  seller_prompt: string | null;
  proof_type: ProofType;
  email_domain: string | null;
  email_subject: string | null;
  email_body: string | null;
  email_verified: number;
  status: NegotiationStatus;
  asking_price: number | null;
  outcome_reasoning: string | null;
  outcome_signature: string | null;
  outcome_signer: string | null;
  outcome_signed_at: string | null;
  tee_attested: number;
  committed_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface CreateInstanceInput {
  buyer_requirement_title: string;
  buyer_requirement: string;
  buyer_prompt?: string;
  max_payment: number;
  model?: string;
  max_turns?: number;
}

export interface CommitNegotiationInput {
  seller_info: string;
  seller_proof?: string;
  seller_prompt?: string;
  proof_type?: ProofType;
  // email_file is handled as multipart, not in this interface
}

export interface PublicInstanceView {
  id: string;
  status: InstanceStatus;
  buyer_address: string;
  buyer_requirement_title: string;
  buyer_requirement: string;
  max_payment: number;
  created_at: string;
}

export interface PublicNegotiationView {
  id: string;
  seller_address: string;
  asking_price: number | null;
  tee_attested: number;
  outcome_signature: string | null;
  outcome_signer: string | null;
}

export interface BuyerNegotiationView {
  id: string;
  instance_id: string;
  seller_address: string;
  status: NegotiationStatus;
  asking_price: number | null;
  seller_info: string | null; // only when accepted
  proof_type: ProofType;
  email_domain: string | null;
  email_verified: number;
  outcome_reasoning: string | null;
  outcome_signature: string | null;
  outcome_signer: string | null;
  tee_attested: number;
  committed_at: string;
  completed_at: string | null;
}

export interface SellerNegotiationView {
  id: string;
  instance_id: string;
  seller_address: string;
  status: NegotiationStatus;
  asking_price: number | null;
  seller_info: string | null; // always visible to seller (their own data)
  seller_proof: string | null;
  proof_type: ProofType;
  email_domain: string | null;
  email_verified: number;
  outcome_reasoning: string | null;
  outcome_signature: string | null;
  outcome_signer: string | null;
  tee_attested: number;
  committed_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface MyInstancesResponse {
  as_buyer: PublicInstanceView[];
  as_seller: Array<SellerNegotiationView & { buyer_requirement_title: string; buyer_requirement: string; max_payment: number }>;
}

export interface Message {
  id: string;
  negotiation_id: string;
  role: "seller" | "buyer";
  content: string;
  turn: number;
  created_at: string;
}

export type ProgressEventType =
  | "turn_start"
  | "seller_response"
  | "buyer_response"
  | "proposed"
  | "rejected"
  | "error"
  | "heartbeat";

export interface ProgressEvent {
  type: ProgressEventType;
  negotiation_id?: string;
  turn?: number;
  asking_price?: number;
  error?: string;
  timestamp: string;
}

export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export interface TeeInfo {
  enabled: boolean;
  signerAddress: string;
  chainId: number;
  contractAddress: string;
  tokenAddress: string;
  domain: EIP712Domain;
}

export interface TeeVerification {
  negotiationId: string;
  buyer: string;
  seller: string;
  outcome: string;
  finalPrice: string;
  timestamp: number;
  signature: string;
  signerAddress: string;
  teeAttested: boolean;
  domain: EIP712Domain;
  types: Record<string, Array<{ name: string; type: string }>>;
  value: Record<string, unknown>;
}
