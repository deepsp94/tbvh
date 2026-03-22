import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { config } from "../config.js";
import type { Instance, Negotiation } from "@shared/types.js";

const client = new OpenAI({
  apiKey: config.phalaApiKey,
  baseURL: config.redpillBaseUrl,
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(resolve(__dirname, "../../../prompts/buyer.txt"), "utf-8");

function buildProofStatus(negotiation: Negotiation): string {
  if (negotiation.proof_type === "email" && negotiation.email_verified) {
    return `SELLER PROOF STATUS: The seller's proof has been independently verified by the system. A DKIM-signed email from "${negotiation.email_domain}" was cryptographically validated — this confirms the seller has a genuine, unmodified email from that domain related to their claim. This is a system-level verification, not a claim made by the seller.`;
  }
  return `SELLER PROOF STATUS: The seller has provided a text description of their proof. This has not been independently verified by the system — treat it as a claim, not a fact.`;
}

function buildPrompt(instance: Instance, negotiation: Negotiation): string {
  const customInstructions = instance.buyer_prompt ?? "Negotiate firmly but fairly.";
  const proofStatus = buildProofStatus(negotiation);

  return template
    .replace(/\{\{buyer_requirement\}\}/g, instance.buyer_requirement)
    .replace(/\{\{max_payment\}\}/g, String(instance.max_payment))
    .replace(/\{\{proof_status\}\}/g, proofStatus)
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
  negotiation: Negotiation,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<BuyerResponse> {
  const systemPrompt = buildPrompt(instance, negotiation);

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
