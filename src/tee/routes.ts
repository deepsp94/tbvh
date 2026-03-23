import { Hono } from "hono";
import { TappdClient } from "@phala/dstack-sdk";
import { getTeeWallet, isTeeEnvironment } from "./index.js";
import { getEip712Domain, EIP712_TYPES, buildOutcomeValue } from "./signing.js";
import { getNegotiationById } from "../db/negotiations.js";
import { getInstanceById } from "../db/instances.js";
import { config } from "../config.js";

export const teeRoutes = new Hono();

teeRoutes.get("/info", async (c) => {
  const wallet = await getTeeWallet();
  const trustCenterUrl = config.appId
    ? `https://trust.phala.com/app/${config.appId}`
    : null;

  return c.json({
    enabled: isTeeEnvironment(),
    signerAddress: wallet.address,
    chainId: config.chainId,
    contractAddress: config.escrowContract,
    tokenAddress: config.usdcContract,
    domain: getEip712Domain(),
    trustCenterUrl,
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

teeRoutes.get("/verify/:negotiationId", async (c) => {
  const negotiationId = c.req.param("negotiationId");
  const negotiation = getNegotiationById(negotiationId);

  if (!negotiation) {
    return c.json({ error: "Negotiation not found" }, 404);
  }
  if (!negotiation.outcome_signature) {
    return c.json({ error: "No signed outcome available" }, 400);
  }

  const instance = getInstanceById(negotiation.instance_id);
  if (!instance) {
    return c.json({ error: "Instance not found" }, 404);
  }

  const domain = getEip712Domain();
  const value = buildOutcomeValue(negotiation, instance.buyer_address);

  const trustCenterUrl = config.appId
    ? `https://trust.phala.com/app/${config.appId}`
    : null;

  return c.json({
    negotiationId: negotiation.id,
    buyer: instance.buyer_address,
    seller: negotiation.seller_address,
    outcome: "ACCEPT",
    finalPrice: String(value.finalPrice),
    timestamp: Number(value.timestamp),
    signature: negotiation.outcome_signature,
    signerAddress: negotiation.outcome_signer,
    teeAttested: negotiation.tee_attested === 1,
    trustCenterUrl,
    domain,
    types: EIP712_TYPES,
    value: {
      ...value,
      finalPrice: String(value.finalPrice),
      timestamp: Number(value.timestamp),
    },
  });
});
