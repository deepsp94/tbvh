import OpenAI from "openai";
import { BuyerAgent } from "./agents/buyer.js";
import { SellerAgent } from "./agents/seller.js";
import type {
  NegotiationRequest,
  NegotiationSession,
  NegotiationOutcome,
  AgentMessage,
} from "./types.js";

const MAX_TURNS = 10;

const PHALA_API_BASE = "https://api.redpill.ai/v1";
const DEFAULT_MODEL = "deepseek/deepseek-chat-v3-0324";

export async function* runNegotiation(
  session: NegotiationSession,
  apiKey: string
): AsyncGenerator<AgentMessage | NegotiationOutcome> {
  const client = new OpenAI({
    apiKey,
    baseURL: PHALA_API_BASE,
  });

  const model = session.request.model || DEFAULT_MODEL;

  const buyerAgent = new BuyerAgent(
    client,
    model,
    session.request.buyer_requirement,
    session.request.max_payment,
    session.request.buyer_prompt
  );

  const sellerAgent = new SellerAgent(
    client,
    model,
    session.request.seller_info,
    session.request.seller_proof,
    session.request.seller_prompt
  );

  let turn = 0;

  // Seller opens
  turn++;
  let sellerContent = "";
  const sellerOpening = await sellerAgent.openingStatement((token) => {
    sellerContent += token;
  });

  const sellerMsg: AgentMessage = {
    turn,
    agent: "seller",
    content: sellerOpening,
    timestamp: new Date(),
  };
  session.messages.push(sellerMsg);
  yield sellerMsg;

  // Negotiation loop
  let lastSellerMessage = sellerOpening;

  while (turn < MAX_TURNS) {
    // Buyer responds
    turn++;
    const { content: buyerContent, outcome } = await buyerAgent.respond(
      lastSellerMessage
    );

    const buyerMsg: AgentMessage = {
      turn,
      agent: "buyer",
      content: buyerContent,
      timestamp: new Date(),
    };
    session.messages.push(buyerMsg);
    yield buyerMsg;

    // Check if buyer made a decision
    if (outcome) {
      session.status = "completed";
      session.outcome = outcome;
      yield outcome;
      return;
    }

    // Seller responds
    turn++;
    const sellerResponse = await sellerAgent.respond(buyerContent);

    const sellerResponseMsg: AgentMessage = {
      turn,
      agent: "seller",
      content: sellerResponse,
      timestamp: new Date(),
    };
    session.messages.push(sellerResponseMsg);
    yield sellerResponseMsg;

    lastSellerMessage = sellerResponse;
  }

  // Max turns reached without decision - force rejection
  const timeoutOutcome: NegotiationOutcome = {
    decision: "REJECT",
    reasoning: "Maximum negotiation turns reached without agreement",
  };
  session.status = "completed";
  session.outcome = timeoutOutcome;
  yield timeoutOutcome;
}
