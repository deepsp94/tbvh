import OpenAI from "openai";
import { BuyerAgent } from "./agents/buyer.js";
import { SellerAgent } from "./agents/seller.js";
import { saveMessage } from "./db/messages.js";
import { completeInstance, failInstance } from "./db/instances.js";
import { config } from "./config.js";
import type { Instance, ProgressEvent, NegotiationOutcome } from "./types.js";

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new TimeoutError(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function* runNegotiation(
  instance: Instance,
  abortSignal?: AbortSignal
): AsyncGenerator<ProgressEvent> {
  const client = new OpenAI({
    apiKey: config.phalaApiKey,
    baseURL: config.phalaApiBase,
  });

  const model = instance.model;
  const maxTurns = instance.max_turns;

  // Validate instance has required data
  if (!instance.seller_info || !instance.seller_proof) {
    yield { type: "error", data: { message: "Instance missing seller data" } };
    failInstance(instance.id, "Missing seller data");
    return;
  }

  const buyerAgent = new BuyerAgent(
    client,
    model,
    instance.buyer_requirement,
    instance.max_payment,
    instance.buyer_prompt || undefined
  );

  const sellerAgent = new SellerAgent(
    client,
    model,
    instance.seller_info,
    instance.seller_proof,
    instance.seller_prompt || undefined
  );

  let turn = 0;
  const perTurnTimeout = config.perTurnTimeoutMs;

  // Helper to check abort signal
  const checkAbort = () => {
    if (abortSignal?.aborted) {
      throw new Error("Negotiation aborted");
    }
  };

  try {
    // Seller opens
    turn++;
    checkAbort();
    yield { type: "progress", data: { turn, phase: "seller_presenting" } };

    const sellerOpening = await withTimeout(
      sellerAgent.openingStatement(),
      perTurnTimeout,
      "Seller opening"
    );
    saveMessage(instance.id, turn, "seller", sellerOpening);

    // Negotiation loop
    let lastSellerMessage = sellerOpening;

    while (turn < maxTurns) {
      // Buyer responds
      turn++;
      checkAbort();
      yield { type: "progress", data: { turn, phase: "buyer_evaluating" } };

      const { content: buyerContent, outcome } = await withTimeout(
        buyerAgent.respond(lastSellerMessage),
        perTurnTimeout,
        "Buyer response"
      );
      saveMessage(instance.id, turn, "buyer", buyerContent);

      // Check if buyer made a decision
      if (outcome) {
        completeInstance(
          instance.id,
          outcome.decision,
          outcome.price || null,
          outcome.reasoning
        );

        yield {
          type: "complete",
          data: {
            outcome: outcome.decision,
            price: outcome.price,
            reasoning: outcome.reasoning,
          },
        };
        return;
      }

      // Seller responds
      turn++;
      checkAbort();
      yield { type: "progress", data: { turn, phase: "seller_responding" } };

      const sellerResponse = await withTimeout(
        sellerAgent.respond(buyerContent),
        perTurnTimeout,
        "Seller response"
      );
      saveMessage(instance.id, turn, "seller", sellerResponse);

      lastSellerMessage = sellerResponse;
    }

    // Max turns reached without decision - force rejection
    const timeoutReasoning = "Maximum negotiation turns reached without agreement";
    completeInstance(instance.id, "REJECT", null, timeoutReasoning);

    yield {
      type: "complete",
      data: {
        outcome: "REJECT",
        reasoning: timeoutReasoning,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    failInstance(instance.id, message);
    yield { type: "error", data: { message } };
  }
}
