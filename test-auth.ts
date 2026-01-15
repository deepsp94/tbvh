/**
 * Test script for SIWE authentication flow
 * Run with: npx tsx test-auth.ts
 */

import { Wallet } from "ethers";
import { SiweMessage } from "siwe";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Create test wallets
const buyerWallet = Wallet.createRandom();
const sellerWallet = Wallet.createRandom();

console.log("Test Wallets Created:");
console.log("  Buyer:", buyerWallet.address);
console.log("  Seller:", sellerWallet.address);
console.log("");

async function authenticate(wallet: Wallet, label: string): Promise<string> {
  console.log(`Authenticating ${label}...`);

  // 1. Get nonce
  const nonceRes = await fetch(
    `${BASE_URL}/auth/nonce?address=${wallet.address}`
  );
  const { nonce, expiresAt } = await nonceRes.json();
  console.log(`  Got nonce: ${nonce}`);

  // 2. Create SIWE message
  const message = new SiweMessage({
    domain: "localhost:3000",
    address: wallet.address,
    statement: "Sign in to TBVH",
    uri: "http://localhost:3000",
    version: "1",
    chainId: 1,
    nonce: nonce,
    issuedAt: new Date().toISOString(),
    expirationTime: expiresAt,
  });

  const messageString = message.prepareMessage();

  // 3. Sign the message
  const signature = await wallet.signMessage(messageString);
  console.log(`  Signed message`);

  // 4. Verify and get token
  const verifyRes = await fetch(`${BASE_URL}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: messageString, signature }),
  });

  if (!verifyRes.ok) {
    const error = await verifyRes.json();
    throw new Error(`Auth failed: ${error.error}`);
  }

  const { token, address } = await verifyRes.json();
  console.log(`  Authenticated as: ${address}`);
  console.log("");

  return token;
}

async function createInstance(
  token: string,
  requirement: string,
  maxPayment: number
): Promise<string> {
  console.log("Creating instance...");

  const res = await fetch(`${BASE_URL}/instances`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      buyer_requirement: requirement,
      max_payment: maxPayment,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Create failed: ${error.error}`);
  }

  const instance = await res.json();
  console.log(`  Instance created: ${instance.id}`);
  console.log(`  Status: ${instance.status}`);
  console.log("");

  return instance.id;
}

async function commitToInstance(
  token: string,
  instanceId: string,
  sellerInfo: string,
  sellerProof: string
): Promise<void> {
  console.log("Seller committing to instance...");

  const res = await fetch(`${BASE_URL}/instances/${instanceId}/commit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      seller_info: sellerInfo,
      seller_proof: sellerProof,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Commit failed: ${error.error}`);
  }

  const result = await res.json();
  console.log(`  Committed. Status: ${result.status}`);
  console.log("");
}

async function startNegotiation(
  token: string,
  instanceId: string
): Promise<void> {
  console.log("Starting negotiation...");

  const res = await fetch(`${BASE_URL}/instances/${instanceId}/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Start failed: ${error.error}`);
  }

  const result = await res.json();
  console.log(`  Started. Status: ${result.status}`);
  console.log("");
}

async function streamNegotiation(
  token: string,
  instanceId: string
): Promise<void> {
  console.log("Streaming negotiation progress...");
  console.log("(Note: Only progress events shown, not conversation content)");
  console.log("");

  const res = await fetch(`${BASE_URL}/instances/${instanceId}/stream`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Stream failed: ${error.error}`);
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error("No reader");
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n");

    for (const line of lines) {
      if (line.startsWith("event:")) {
        const eventType = line.slice(7).trim();
        process.stdout.write(`  [${eventType}] `);
      } else if (line.startsWith("data:")) {
        const data = JSON.parse(line.slice(5).trim());
        console.log(JSON.stringify(data));
      }
    }
  }

  console.log("");
}

async function getInstanceDetails(
  token: string,
  instanceId: string,
  label: string
): Promise<void> {
  console.log(`Getting instance details (as ${label})...`);

  const res = await fetch(`${BASE_URL}/instances/${instanceId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const instance = await res.json();
  console.log(`  Status: ${instance.status}`);
  console.log(`  Outcome: ${instance.outcome || "N/A"}`);
  console.log(`  Final Price: ${instance.final_price || "N/A"}`);
  console.log(`  Reasoning: ${instance.outcome_reasoning || "N/A"}`);

  if (instance.seller_info) {
    console.log(`  Seller Info (REVEALED): ${instance.seller_info}`);
  } else {
    console.log(`  Seller Info: [NOT REVEALED - ${label} cannot see this]`);
  }

  console.log("");
}

async function main() {
  try {
    // 1. Check health
    const healthRes = await fetch(`${BASE_URL}/health`);
    if (!healthRes.ok) {
      throw new Error("Server not running");
    }
    console.log("Server is healthy\n");

    // 2. Authenticate both users
    const buyerToken = await authenticate(buyerWallet, "Buyer");
    const sellerToken = await authenticate(sellerWallet, "Seller");

    // 3. Buyer creates instance
    const instanceId = await createInstance(
      buyerToken,
      "I need actionable intelligence on upcoming tech earnings that could move the market.",
      500
    );

    // 4. Seller commits
    await commitToInstance(
      sellerToken,
      instanceId,
      "Q4 earnings for a major cloud company will beat analyst expectations by 15-20%. Announcement in 3 days.",
      "Source is a senior finance employee. Track record: 4/5 accurate predictions."
    );

    // 5. Buyer starts negotiation
    await startNegotiation(buyerToken, instanceId);

    // 6. Stream the negotiation
    await streamNegotiation(buyerToken, instanceId);

    // 7. Check instance details from both perspectives
    await getInstanceDetails(buyerToken, instanceId, "buyer");
    await getInstanceDetails(sellerToken, instanceId, "seller");

    console.log("=== Test Complete ===");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
