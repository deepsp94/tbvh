import OpenAI from "openai";
import type { AgentMessage, NegotiationOutcome } from "../types.js";

const DEFAULT_BUYER_PROMPT = `You are a buyer agent evaluating information for purchase in a prediction market context.

Your goal is to determine if the seller's information is valuable enough to pay for.

Guidelines:
- Ask clarifying questions to assess credibility and specificity
- Consider: Is this actionable? Is the source credible? Is the timing relevant?
- You can negotiate on price
- After sufficient evaluation (usually 3-5 exchanges), make a final decision

When ready to decide, respond with EXACTLY this format on its own line:
DECISION: ACCEPT $[amount] - [one sentence reasoning]
or
DECISION: REJECT - [one sentence reasoning]

Do not include the DECISION line until you are ready to conclude.`;

export class BuyerAgent {
  private client: OpenAI;
  private model: string;
  private systemPrompt: string;
  private requirement: string;
  private maxPayment: number;
  private conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  constructor(
    client: OpenAI,
    model: string,
    requirement: string,
    maxPayment: number,
    customPrompt?: string
  ) {
    this.client = client;
    this.model = model;
    this.requirement = requirement;
    this.maxPayment = maxPayment;
    this.systemPrompt = this.buildSystemPrompt(customPrompt);
  }

  private buildSystemPrompt(customPrompt?: string): string {
    const base = customPrompt || DEFAULT_BUYER_PROMPT;
    return `${base}

Requirement: ${this.requirement}
Maximum Budget: $${this.maxPayment}`;
  }

  async respond(
    sellerMessage: string,
    onToken?: (token: string) => void
  ): Promise<{ content: string; outcome?: NegotiationOutcome }> {
    this.conversationHistory.push({
      role: "user",
      content: `[SELLER]: ${sellerMessage}`,
    });

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: this.systemPrompt },
        ...this.conversationHistory,
      ],
      stream: true,
    });

    let fullContent = "";
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || "";
      fullContent += token;
      if (onToken && token) {
        onToken(token);
      }
    }

    this.conversationHistory.push({
      role: "assistant",
      content: fullContent,
    });

    const outcome = this.parseDecision(fullContent);
    return { content: fullContent, outcome };
  }

  private parseDecision(content: string): NegotiationOutcome | undefined {
    const acceptMatch = content.match(
      /DECISION:\s*ACCEPT\s*\$(\d+(?:\.\d+)?)\s*-\s*(.+)/i
    );
    if (acceptMatch) {
      const price = parseFloat(acceptMatch[1]);
      if (price <= this.maxPayment) {
        return {
          decision: "ACCEPT",
          price,
          reasoning: acceptMatch[2].trim(),
        };
      } else {
        return {
          decision: "REJECT",
          reasoning: `Proposed price $${price} exceeds budget of $${this.maxPayment}`,
        };
      }
    }

    const rejectMatch = content.match(/DECISION:\s*REJECT\s*-\s*(.+)/i);
    if (rejectMatch) {
      return {
        decision: "REJECT",
        reasoning: rejectMatch[1].trim(),
      };
    }

    return undefined;
  }
}
