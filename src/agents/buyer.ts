import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { config } from "../config.js";
import type { Instance } from "@shared/types.js";

const client = new OpenAI({
  apiKey: config.phalaApiKey,
  baseURL: config.redpillBaseUrl,
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(resolve(__dirname, "../../prompts/buyer.txt"), "utf-8");

function buildPrompt(instance: Instance): string {
  const customInstructions = instance.buyer_prompt ?? "Negotiate firmly but fairly.";

  return template
    .replace(/\{\{buyer_requirement\}\}/g, instance.buyer_requirement)
    .replace(/\{\{max_payment\}\}/g, String(instance.max_payment))
    .replace(/\{\{custom_instructions\}\}/g, customInstructions);
}

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
  const systemPrompt = buildPrompt(instance);

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
