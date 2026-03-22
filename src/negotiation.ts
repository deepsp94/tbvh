import { getMessages, insertMessage } from "./db/messages.js";
import { insertEvent } from "./db/events.js";
import { setProposed, setRejected, setFailed, setAskingPrice } from "./db/negotiations.js";
import { getInstanceById } from "./db/instances.js";
import { callSellerAgent } from "./agents/seller.js";
import { callBuyerAgent } from "./agents/buyer.js";
import type { Negotiation, ProgressEvent } from "@shared/types.js";

function emit(negotiationId: string, event: Omit<ProgressEvent, "timestamp">): void {
  insertEvent(negotiationId, event);
}

export async function runNegotiation(negotiation: Negotiation): Promise<void> {
  const instance = getInstanceById(negotiation.instance_id);
  if (!instance) {
    setFailed(negotiation.id, "Instance not found");
    emit(negotiation.id, { type: "error", negotiation_id: negotiation.id, error: "Instance not found" });
    return;
  }

  try {
    for (let turn = 1; turn <= instance.max_turns; turn++) {
      emit(negotiation.id, { type: "turn_start", negotiation_id: negotiation.id, turn });

      // --- Seller turn ---
      const msgs = getMessages(negotiation.id);
      const sellerHistory = msgs.map((m) => ({
        role: m.role === "seller" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

      const sellerResp = await callSellerAgent(instance, negotiation, sellerHistory);
      insertMessage(negotiation.id, "seller", sellerResp.message, turn);
      setAskingPrice(negotiation.id, sellerResp.asking_price);
      emit(negotiation.id, { type: "seller_response", negotiation_id: negotiation.id, turn });

      // Auto-reject if asking_price > max_payment
      if (sellerResp.asking_price > instance.max_payment) {
        setRejected(negotiation.id, `Seller asking price ${sellerResp.asking_price} exceeds max payment ${instance.max_payment}`);
        emit(negotiation.id, { type: "rejected", negotiation_id: negotiation.id });
        return;
      }

      // --- Buyer turn ---
      const msgsAfterSeller = getMessages(negotiation.id);
      const buyerHistory = msgsAfterSeller.map((m) => ({
        role: m.role === "buyer" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

      const buyerResp = await callBuyerAgent(instance, negotiation, buyerHistory);
      insertMessage(negotiation.id, "buyer", buyerResp.message, turn);
      emit(negotiation.id, { type: "buyer_response", negotiation_id: negotiation.id, turn });

      // --- Decision ---
      if (buyerResp.decision === "ACCEPT") {
        // Deal price is the seller's asking_price
        setProposed(negotiation.id, sellerResp.asking_price);
        emit(negotiation.id, {
          type: "proposed",
          negotiation_id: negotiation.id,
          asking_price: sellerResp.asking_price,
        });
        return;
      }

      if (buyerResp.decision === "REJECT") {
        setRejected(negotiation.id, `Rejected at turn ${turn}`);
        emit(negotiation.id, { type: "rejected", negotiation_id: negotiation.id });
        return;
      }
    }

    // Max turns exhausted
    setRejected(negotiation.id, "Max turns reached without agreement");
    emit(negotiation.id, { type: "rejected", negotiation_id: negotiation.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setFailed(negotiation.id, message);
    emit(negotiation.id, { type: "error", negotiation_id: negotiation.id, error: message });
  }
}
