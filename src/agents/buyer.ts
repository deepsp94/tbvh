import OpenAI from "openai";
import { config } from "../config.js";
import type { Instance } from "@shared/types.js";

const client = new OpenAI({
  apiKey: config.phalaApiKey,
  baseURL: config.redpillBaseUrl,
});

export interface BuyerResponse {
  message: string;
  decision: "ACCEPT" | "REJECT" | "CONTINUE";
  offer_price: number;
  tokens_used: number;
}

export async function callBuyerAgent(
  instance: Instance,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<BuyerResponse> {
  const customInstructions = instance.buyer_prompt ?? "Negotiate firmly but fairly.";

  const systemPrompt = `You are negotiating on behalf of a buyer seeking information.

YOUR REQUIREMENT:
${instance.buyer_requirement}

YOUR BUDGET: ${instance.max_payment} USDC (never offer more than this)

${customInstructions}

Accept only if the information clearly meets your requirement and the price is within budget.
Reject if the information clearly doesn't meet your requirement or the price is unacceptable.
Continue to negotiate for a lower price if you want to keep going.

Respond ONLY with valid JSON, no other text:
{"message": "<your message to the seller>", "decision": "ACCEPT"|"REJECT"|"CONTINUE", "offer_price": <number>}

"decision" must be exactly one of: ACCEPT, REJECT, CONTINUE.
"offer_price" is your current offer in USDC. Must not exceed ${instance.max_payment}.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
  ];

  const response = await client.chat.completions.create({
    model: instance.model,
    messages,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Buyer agent returned invalid JSON: ${raw}`);
  }

  const result = parsed as Record<string, unknown>;
  const validDecisions = ["ACCEPT", "REJECT", "CONTINUE"];
  if (
    typeof result.message !== "string" ||
    typeof result.decision !== "string" ||
    !validDecisions.includes(result.decision) ||
    typeof result.offer_price !== "number" ||
    !isFinite(result.offer_price)
  ) {
    throw new Error(`Buyer agent returned unexpected shape: ${raw}`);
  }

  return {
    message: result.message,
    decision: result.decision as "ACCEPT" | "REJECT" | "CONTINUE",
    offer_price: Math.min(result.offer_price, instance.max_payment),
    tokens_used: response.usage?.total_tokens ?? 0,
  };
}
