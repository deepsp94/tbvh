import { getMessages, insertMessage } from "./db/messages.js";
import { insertEvent } from "./db/events.js";
import { trackUsage, checkDailyLimit } from "./db/usage.js";
import { setCompleted, setFailed } from "./db/instances.js";
import { callSellerAgent } from "./agents/seller.js";
import { callBuyerAgent } from "./agents/buyer.js";
import type { Instance, ProgressEvent } from "@shared/types.js";

function emit(instanceId: string, event: Omit<ProgressEvent, "timestamp">): void {
  insertEvent(instanceId, event);
}

export async function runNegotiation(instance: Instance): Promise<void> {
  try {
    for (let turn = 1; turn <= instance.max_turns; turn++) {
      // Check daily token limit
      if (!checkDailyLimit(instance.model)) {
        setFailed(instance.id, "Daily token limit reached");
        emit(instance.id, { type: "error", error: "Daily token limit reached" });
        return;
      }

      emit(instance.id, { type: "turn_start", turn });

      // --- Seller turn ---
      const msgs = getMessages(instance.id);
      const sellerHistory = msgs.map((m) => ({
        role: m.role === "seller" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

      const sellerResp = await callSellerAgent(instance, sellerHistory);
      trackUsage(instance.model, sellerResp.tokens_used);
      insertMessage(instance.id, "seller", sellerResp.message, turn);
      emit(instance.id, {
        type: "seller_message",
        turn,
        content: sellerResp.message,
      });

      // --- Buyer turn ---
      const msgsAfterSeller = getMessages(instance.id);
      const buyerHistory = msgsAfterSeller.map((m) => ({
        role: m.role === "buyer" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

      const buyerResp = await callBuyerAgent(instance, buyerHistory);
      trackUsage(instance.model, buyerResp.tokens_used);
      insertMessage(instance.id, "buyer", buyerResp.message, turn);
      emit(instance.id, {
        type: "buyer_message",
        turn,
        content: buyerResp.message,
      });

      // --- Decision ---
      if (buyerResp.decision === "ACCEPT") {
        const finalPrice = Math.min(buyerResp.offer_price, sellerResp.asking_price);
        setCompleted(instance.id, "ACCEPT", finalPrice, `Accepted at turn ${turn}, price: ${finalPrice} USDC`);
        emit(instance.id, {
          type: "outcome",
          outcome: {
            outcome: "ACCEPT",
            final_price: finalPrice,
            reasoning: buyerResp.message,
          },
        });
        return;
      }

      if (buyerResp.decision === "REJECT") {
        setCompleted(instance.id, "REJECT", null, `Rejected at turn ${turn}`);
        emit(instance.id, {
          type: "outcome",
          outcome: {
            outcome: "REJECT",
            final_price: null,
            reasoning: buyerResp.message,
          },
        });
        return;
      }
    }

    // Max turns exhausted
    setCompleted(instance.id, "REJECT", null, "Max turns reached without agreement");
    emit(instance.id, {
      type: "outcome",
      outcome: {
        outcome: "REJECT",
        final_price: null,
        reasoning: "Max turns reached without agreement",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setFailed(instance.id, message);
    emit(instance.id, { type: "error", error: message });
  }
}
