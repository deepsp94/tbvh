import { ethers } from "ethers";
import { config } from "../config.js";
import { getTeeWallet } from "./index.js";
import type { Negotiation, EIP712Domain } from "@shared/types.js";

export function getEip712Domain(): EIP712Domain {
  return {
    name: "TBVH",
    version: "1",
    chainId: config.chainId,
    verifyingContract: config.escrowContract,
  };
}

export const EIP712_TYPES = {
  NegotiationOutcome: [
    { name: "instanceId", type: "bytes32" },
    { name: "buyer", type: "address" },
    { name: "seller", type: "address" },
    { name: "outcome", type: "string" },
    { name: "finalPrice", type: "uint256" },
    { name: "timestamp", type: "uint256" },
  ],
};

export function buildOutcomeValue(
  negotiation: Negotiation,
  buyerAddress: string
): Record<string, unknown> {
  if (!negotiation.completed_at) {
    throw new Error("Cannot sign outcome: negotiation not completed");
  }

  return {
    // Contract field is named "instanceId" but we pass negotiation ID as value
    instanceId: ethers.id(negotiation.id),
    buyer: buyerAddress,
    seller: negotiation.seller_address,
    outcome: "ACCEPT",
    finalPrice: BigInt(Math.round((negotiation.asking_price ?? 0) * 1_000_000)),
    timestamp: BigInt(Math.floor(new Date(negotiation.completed_at).getTime() / 1000)),
  };
}

export async function signOutcome(
  negotiation: Negotiation,
  buyerAddress: string
): Promise<{ signature: string; signerAddress: string }> {
  const wallet = await getTeeWallet();
  const domain = getEip712Domain();
  const value = buildOutcomeValue(negotiation, buyerAddress);
  const signature = await wallet.signTypedData(domain, EIP712_TYPES, value);
  return { signature, signerAddress: wallet.address };
}
