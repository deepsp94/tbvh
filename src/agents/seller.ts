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
const template = readFileSync(resolve(__dirname, "../../prompts/seller.txt"), "utf-8");

function buildPrompt(instance: Instance, negotiation: Negotiation): string {
  let proofSection: string;
  if (negotiation.proof_type === "email" && negotiation.email_verified && negotiation.email_body) {
    proofSection = `PROOF OF AUTHENTICITY (TEE-VERIFIED EMAIL from ${negotiation.email_domain}):
Subject: ${negotiation.email_subject ?? "(no subject)"}
Body:
${negotiation.email_body}

This email has been cryptographically verified via DKIM by the TEE. It is genuine and unmodified.`;
  } else {
    proofSection = `PROOF OF AUTHENTICITY:
${negotiation.seller_proof}`;
  }

  return template
    .replace(/\{\{seller_info\}\}/g, negotiation.seller_info ?? "")
    .replace(/\{\{proof_section\}\}/g, proofSection)
    .replace(/\{\{buyer_requirement\}\}/g, instance.buyer_requirement)
    .replace(/\{\{max_payment\}\}/g, String(instance.max_payment));
}

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
  const systemPrompt = buildPrompt(instance, negotiation);

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
