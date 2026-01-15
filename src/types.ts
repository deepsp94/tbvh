export interface NegotiationRequest {
  buyer_requirement: string;
  seller_info: string;
  seller_proof: string;
  buyer_prompt?: string;
  seller_prompt?: string;
  max_payment: number;
  model?: string;
}

export interface NegotiationSession {
  id: string;
  request: NegotiationRequest;
  messages: AgentMessage[];
  status: "pending" | "running" | "completed";
  outcome?: NegotiationOutcome;
  createdAt: Date;
}

export interface AgentMessage {
  turn: number;
  agent: "buyer" | "seller";
  content: string;
  timestamp: Date;
}

export interface NegotiationOutcome {
  decision: "ACCEPT" | "REJECT";
  price?: number;
  reasoning: string;
}

export type SSEEvent =
  | { type: "message"; data: AgentMessage }
  | { type: "done"; data: NegotiationOutcome }
  | { type: "error"; data: { message: string } };
