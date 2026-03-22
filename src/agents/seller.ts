import OpenAI from "openai";
import { config } from "../config.js";
import type { Instance, Negotiation } from "@shared/types.js";

const client = new OpenAI({
  apiKey: config.phalaApiKey,
  baseURL: config.redpillBaseUrl,
});

export interface SellerResponse {
  message: string;
  asking_price: number;
  tokens_used: number;
}

export async function callSellerAgent(
  instance: Instance,
  negotiation: Negotiation,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<SellerResponse> {
  const systemPrompt = `You are negotiating on behalf of a seller of information.

YOUR INFORMATION:
${negotiation.seller_info}

PROOF OF AUTHENTICITY:
${negotiation.seller_proof}

BUYER'S REQUIREMENT:
${instance.buyer_requirement}

Convince the buyer your information meets their requirement. Negotiate for the highest price.
Never fabricate. You may describe what you know in general terms before a deal is struck.

Respond ONLY with valid JSON, no other text:
{"message": "<your message to the buyer>", "asking_price": <number>}

"asking_price" is your current asking price in USDC as a plain number (e.g. 42.5).`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
  ];

  if (conversationHistory.length === 0) {
    messages.push({ role: "user", content: "Please begin the negotiation with your opening offer." });
  }

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
    throw new Error(`Seller agent returned invalid JSON: ${raw}`);
  }

  const result = parsed as Record<string, unknown>;
  if (
    typeof result.message !== "string" ||
    typeof result.asking_price !== "number" ||
    !isFinite(result.asking_price) ||
    result.asking_price <= 0
  ) {
    throw new Error(`Seller agent returned unexpected shape: ${raw}`);
  }

  return {
    message: result.message,
    asking_price: result.asking_price,
    tokens_used: response.usage?.total_tokens ?? 0,
  };
}
