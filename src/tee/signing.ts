import { ethers } from "ethers";
import { config } from "../config.js";
import { getTeeWallet } from "./index.js";
import type { Instance, EIP712Domain } from "@shared/types.js";

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

export function buildOutcomeValue(instance: Instance): Record<string, unknown> {
  if (!instance.seller_address) {
    throw new Error("Cannot sign outcome: no seller address");
  }
  if (!instance.completed_at) {
    throw new Error("Cannot sign outcome: instance not completed");
  }

  return {
    instanceId: ethers.id(instance.id),
    buyer: instance.buyer_address,
    seller: instance.seller_address,
    outcome: instance.outcome ?? "REJECT",
    finalPrice: BigInt(Math.round((instance.final_price ?? 0) * 1_000_000)),
    timestamp: BigInt(Math.floor(new Date(instance.completed_at).getTime() / 1000)),
  };
}

export async function signOutcome(
  instance: Instance
): Promise<{ signature: string; signerAddress: string }> {
  const wallet = await getTeeWallet();
  const domain = getEip712Domain();
  const value = buildOutcomeValue(instance);
  const signature = await wallet.signTypedData(domain, EIP712_TYPES, value);
  return { signature, signerAddress: wallet.address };
}
