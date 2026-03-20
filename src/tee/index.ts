import { ethers } from "ethers";
import { TappdClient } from "@phala/dstack-sdk";
import { config } from "../config.js";

let walletPromise: Promise<ethers.Wallet> | null = null;

export function isTeeEnvironment(): boolean {
  return config.teeMode !== "dev";
}

async function deriveWallet(): Promise<ethers.Wallet> {
  if (config.teeMode === "production" || config.teeMode === "simulator") {
    const endpoint =
      config.teeMode === "simulator"
        ? process.env.DSTACK_SIMULATOR_ENDPOINT
        : undefined;
    const client = new TappdClient(endpoint);
    const result = await client.deriveKey("tbvh-signer", "v1");
    const raw = result.asUint8Array();
    const key = ethers.keccak256(raw);
    return new ethers.Wallet(key);
  }

  // Dev fallback: deterministic key from seed
  const key = ethers.keccak256(ethers.toUtf8Bytes(config.teeDevSeed));
  return new ethers.Wallet(key);
}

export async function getTeeWallet(): Promise<ethers.Wallet> {
  if (!walletPromise) {
    walletPromise = deriveWallet();
  }
  return walletPromise;
}
