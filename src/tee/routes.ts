import { Hono } from "hono";
import { TappdClient } from "@phala/dstack-sdk";
import { getTeeWallet, isTeeEnvironment } from "./index.js";
import { getEip712Domain, EIP712_TYPES, buildOutcomeValue } from "./signing.js";
import { getInstanceById } from "../db/instances.js";
import { config } from "../config.js";

export const teeRoutes = new Hono();

teeRoutes.get("/info", async (c) => {
  const wallet = await getTeeWallet();
  return c.json({
    enabled: isTeeEnvironment(),
    signerAddress: wallet.address,
    chainId: config.chainId,
    contractAddress: config.escrowContract,
    tokenAddress: config.usdcContract,
    domain: getEip712Domain(),
  });
});

teeRoutes.get("/attestation", async (c) => {
  if (!isTeeEnvironment()) {
    return c.json({ attestation: null });
  }

  try {
    const wallet = await getTeeWallet();
    const endpoint =
      config.teeMode === "simulator"
        ? process.env.DSTACK_SIMULATOR_ENDPOINT
        : undefined;
    const client = new TappdClient(endpoint);
    const quote = await client.tdxQuote(wallet.address);
    return c.json({ attestation: quote });
  } catch (err) {
    return c.json({ attestation: null, error: String(err) });
  }
});

teeRoutes.get("/verify/:instanceId", async (c) => {
  const instanceId = c.req.param("instanceId");
  const instance = getInstanceById(instanceId);

  if (!instance) {
    return c.json({ error: "Instance not found" }, 404);
  }
  if (!instance.outcome_signature) {
    return c.json({ error: "No signed outcome available" }, 400);
  }

  const domain = getEip712Domain();
  const value = buildOutcomeValue(instance);

  return c.json({
    instanceId: instance.id,
    buyer: instance.buyer_address,
    seller: instance.seller_address,
    outcome: instance.outcome,
    finalPrice: String(value.finalPrice),
    timestamp: Number(value.timestamp),
    signature: instance.outcome_signature,
    signerAddress: instance.outcome_signer,
    teeAttested: instance.tee_attested === 1,
    domain,
    types: EIP712_TYPES,
    value: {
      ...value,
      finalPrice: String(value.finalPrice),
      timestamp: Number(value.timestamp),
    },
  });
});
