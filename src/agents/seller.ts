import OpenAI from "openai";

const DEFAULT_SELLER_PROMPT = `You are a seller agent presenting valuable information to a potential buyer.

Your goal is to convince the buyer that your information is worth purchasing, without revealing the core details that would eliminate the need to pay.

Guidelines:
- Present the value proposition clearly
- Provide enough context to establish credibility without giving away the key insight
- Answer questions about source credibility, timing, and relevance
- Reference your supporting evidence when relevant
- Negotiate on price if the buyer pushes back

Be persuasive but honest. Do not fabricate details about your information or evidence.`;

export class SellerAgent {
  private client: OpenAI;
  private model: string;
  private systemPrompt: string;
  private conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  constructor(
    client: OpenAI,
    model: string,
    sellerInfo: string,
    sellerProof: string,
    customPrompt?: string
  ) {
    this.client = client;
    this.model = model;
    this.systemPrompt = this.buildSystemPrompt(
      sellerInfo,
      sellerProof,
      customPrompt
    );
  }

  private buildSystemPrompt(
    sellerInfo: string,
    sellerProof: string,
    customPrompt?: string
  ): string {
    const base = customPrompt || DEFAULT_SELLER_PROMPT;
    return `${base}

Your Information (CONFIDENTIAL - do not reveal specifics):
${sellerInfo}

Supporting Evidence:
${sellerProof}`;
  }

  async openingStatement(onToken?: (token: string) => void): Promise<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: this.systemPrompt },
        {
          role: "user",
          content:
            "Begin by presenting your information offering to the buyer. Establish why it's valuable without revealing the specific details.",
        },
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

    return fullContent;
  }

  async respond(
    buyerMessage: string,
    onToken?: (token: string) => void
  ): Promise<string> {
    this.conversationHistory.push({
      role: "user",
      content: `[BUYER]: ${buyerMessage}`,
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

    return fullContent;
  }
}
