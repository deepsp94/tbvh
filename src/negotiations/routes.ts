import { Hono } from "hono";
import { stream } from "hono/streaming";
import { ethers } from "ethers";
import { verifyEmail } from "../email/verify.js";
import {
  createNegotiation,
  getNegotiationById,
  getNegotiationsByInstance,
  hasActiveNegotiation,
  setRunning,
  setAccepted,
  setCancelled,
  setSignature,
} from "../db/negotiations.js";
import { getInstanceById } from "../db/instances.js";
import {
  getEvents,
  getEventsAfter,
  getEventsByInstance,
  getEventsByInstanceAfter,
} from "../db/events.js";
import { checkNegotiationLimit, recordNegotiation } from "../db/usage.js";
import { requireAuth, optionalAuth, type Variables } from "../auth/middleware.js";
import { verifyToken } from "../auth/jwt.js";
import { runNegotiation } from "../negotiation.js";
import { signOutcome } from "../tee/signing.js";
import { isTeeEnvironment } from "../tee/index.js";
import { config } from "../config.js";
import type {
  CommitNegotiationInput,
  Negotiation,
  BuyerNegotiationView,
  SellerNegotiationView,
  PublicNegotiationView,
} from "@shared/types.js";

export const negotiationRoutes = new Hono<{ Variables: Variables }>();

// Escrow ABI fragment for reading deposits
const ESCROW_ABI = [
  "function deposits(bytes32) view returns (address buyer, uint256 amount, uint256 depositedAt, bool settled)",
];

function toBuyerView(n: Negotiation): BuyerNegotiationView {
  return {
    id: n.id,
    instance_id: n.instance_id,
    seller_address: n.seller_address,
    status: n.status,
    asking_price: n.asking_price,
    seller_info: n.status === "accepted" ? n.seller_info : null,
    proof_type: n.proof_type,
    email_domain: n.email_domain,
    email_verified: n.email_verified,
    outcome_reasoning: n.outcome_reasoning,
    outcome_signature: n.outcome_signature,
    outcome_signer: n.outcome_signer,
    tee_attested: n.tee_attested,
    committed_at: n.committed_at,
    completed_at: n.completed_at,
  };
}

function toSellerView(n: Negotiation): SellerNegotiationView {
  return {
    id: n.id,
    instance_id: n.instance_id,
    seller_address: n.seller_address,
    status: n.status,
    asking_price: n.asking_price,
    seller_info: n.seller_info,
    seller_proof: n.seller_proof,
    proof_type: n.proof_type,
    email_domain: n.email_domain,
    email_verified: n.email_verified,
    outcome_reasoning: n.outcome_reasoning,
    outcome_signature: n.outcome_signature,
    outcome_signer: n.outcome_signer,
    tee_attested: n.tee_attested,
    committed_at: n.committed_at,
    started_at: n.started_at,
    completed_at: n.completed_at,
  };
}

function toPublicView(n: Negotiation): PublicNegotiationView {
  return {
    id: n.id,
    seller_address: n.seller_address,
    asking_price: n.asking_price,
    tee_attested: n.tee_attested,
    outcome_signature: n.outcome_signature,
    outcome_signer: n.outcome_signer,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// POST /instances/:id/negotiate — seller commits (JSON or multipart with .eml)
negotiationRoutes.post("/instances/:id/negotiate", requireAuth, async (c) => {
  const instanceId = c.req.param("id");
  const address = c.get("address");

  const instance = getInstanceById(instanceId);
  if (!instance) return c.json({ error: "Instance not found" }, 404);
  if (instance.status !== "open") {
    return c.json({ error: "Instance is not open" }, 409);
  }
  if (instance.buyer_address === address) {
    return c.json({ error: "Buyer cannot commit as seller" }, 403);
  }
  if (hasActiveNegotiation(instanceId, address)) {
    return c.json({ error: "You already have an active negotiation on this instance" }, 409);
  }

  const contentType = c.req.header("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  let sellerInfo: string;
  let sellerProof: string | undefined;
  let sellerPrompt: string | undefined;
  let proofType: "text" | "email" = "text";
  let emailDomain: string | undefined;
  let emailSubject: string | undefined;
  let emailBody: string | undefined;
  let emailVerified = false;

  if (isMultipart) {
    const formData = await c.req.formData();
    sellerInfo = formData.get("seller_info") as string;
    sellerProof = (formData.get("seller_proof") as string) || undefined;
    sellerPrompt = (formData.get("seller_prompt") as string) || undefined;
    const emlFile = formData.get("email_file") as File | null;

    if (!sellerInfo || typeof sellerInfo !== "string") {
      return c.json({ error: "seller_info is required" }, 400);
    }

    if (emlFile) {
      if (emlFile.size > 1_000_000) {
        return c.json({ error: "Email file must be under 1MB" }, 400);
      }
      const emlBuffer = Buffer.from(await emlFile.arrayBuffer());
      const result = await verifyEmail(emlBuffer);
      if (!result.verified) {
        return c.json({ error: result.error ?? "DKIM verification failed" }, 400);
      }
      proofType = "email";
      emailDomain = result.domain ?? undefined;
      emailSubject = result.subject ?? undefined;
      emailBody = result.body ?? undefined;
      emailVerified = true;
      sellerProof = `Verified email from ${emailDomain}`;
    } else if (!sellerProof) {
      return c.json({ error: "seller_proof or email_file is required" }, 400);
    }
  } else {
    const body = await c.req.json<CommitNegotiationInput>();
    sellerInfo = body.seller_info;
    sellerProof = body.seller_proof;
    sellerPrompt = body.seller_prompt;

    if (!sellerInfo || typeof sellerInfo !== "string") {
      return c.json({ error: "seller_info is required" }, 400);
    }
    if (!sellerProof || typeof sellerProof !== "string") {
      return c.json({ error: "seller_proof is required" }, 400);
    }
  }

  const negotiation = createNegotiation(instanceId, address, {
    seller_info: sellerInfo,
    seller_proof: sellerProof,
    seller_prompt: sellerPrompt,
    proof_type: proofType,
    email_domain: emailDomain,
    email_subject: emailSubject,
    email_body: emailBody,
    email_verified: emailVerified,
  });
  return c.json(toSellerView(negotiation), 201);
});

// GET /instances/:id/negotiations — list negotiations for instance
negotiationRoutes.get("/instances/:id/negotiations", optionalAuth, (c) => {
  const instanceId = c.req.param("id");
  const address = c.get("address");

  const instance = getInstanceById(instanceId);
  if (!instance) return c.json({ error: "Instance not found" }, 404);

  const negotiations = getNegotiationsByInstance(instanceId);
  const isBuyer = address === instance.buyer_address;

  if (isBuyer) {
    return c.json(negotiations.map(toBuyerView));
  }

  // Seller sees only their own
  if (address) {
    const mine = negotiations.filter((n) => n.seller_address === address);
    if (mine.length > 0) {
      return c.json(mine.map(toSellerView));
    }
  }

  // Non-participant: only accepted
  const accepted = negotiations.filter((n) => n.status === "accepted");
  return c.json(accepted.map(toPublicView));
});

// POST /negotiations/:nid/run — buyer starts negotiation
negotiationRoutes.post("/negotiations/:nid/run", requireAuth, async (c) => {
  const nid = c.req.param("nid");
  const address = c.get("address");

  const negotiation = getNegotiationById(nid);
  if (!negotiation) return c.json({ error: "Negotiation not found" }, 404);

  const instance = getInstanceById(negotiation.instance_id);
  if (!instance) return c.json({ error: "Instance not found" }, 404);
  if (instance.buyer_address !== address) {
    return c.json({ error: "Only the buyer can start negotiation" }, 403);
  }

  if (!checkNegotiationLimit(address)) {
    return c.json({ error: "Daily negotiation limit reached" }, 429);
  }

  const result = setRunning(nid);
  if (!result.success) {
    return c.json({ error: "Negotiation must be committed before running" }, 409);
  }

  recordNegotiation(address);

  runNegotiation(result.negotiation!).catch((err) =>
    console.error("Negotiation failed for", nid, ":", err)
  );

  return c.json({ message: "Negotiation started" }, 202);
});

// GET /instances/:id/stream — buyer stream (all negotiations for instance)
negotiationRoutes.get("/instances/:id/stream", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.json({ error: "token required" }, 401);

  let address: string;
  try {
    const payload = await verifyToken(token);
    address = payload.sub;
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }

  const id = c.req.param("id");
  const instance = getInstanceById(id);
  if (!instance) return c.json({ error: "Instance not found" }, 404);
  if (instance.buyer_address !== address) {
    return c.json({ error: "Forbidden" }, 403);
  }

  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");
  c.header("X-Accel-Buffering", "no");

  return stream(c, async (s) => {
    let lastSeq = 0;
    const existing = getEventsByInstance(id);
    for (const ev of existing) {
      await s.write(`data: ${JSON.stringify(ev)}\n\n`);
      lastSeq = Math.max(lastSeq, ev.seq);
    }

    // Check if all negotiations are terminal
    const isTerminal = (type: string) => type === "proposed" || type === "rejected" || type === "error";

    let heartbeatAt = Date.now();
    while (true) {
      await sleep(500);
      const newEvs = getEventsByInstanceAfter(id, lastSeq);
      for (const ev of newEvs) {
        await s.write(`data: ${JSON.stringify(ev)}\n\n`);
        lastSeq = Math.max(lastSeq, ev.seq);
      }
      if (Date.now() - heartbeatAt > 15_000) {
        await s.write(": heartbeat\n\n");
        heartbeatAt = Date.now();
      }
      // Check if there are any active negotiations left
      const negs = getNegotiationsByInstance(id);
      const hasActive = negs.some((n) =>
        n.status === "committed" || n.status === "running"
      );
      if (!hasActive && negs.length > 0) break;
    }
  });
});

// GET /negotiations/:nid/stream — seller stream (single negotiation)
negotiationRoutes.get("/negotiations/:nid/stream", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.json({ error: "token required" }, 401);

  let address: string;
  try {
    const payload = await verifyToken(token);
    address = payload.sub;
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }

  const nid = c.req.param("nid");
  const negotiation = getNegotiationById(nid);
  if (!negotiation) return c.json({ error: "Negotiation not found" }, 404);
  if (negotiation.seller_address !== address) {
    return c.json({ error: "Forbidden" }, 403);
  }

  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");
  c.header("X-Accel-Buffering", "no");

  return stream(c, async (s) => {
    let lastSeq = 0;
    const existing = getEvents(nid);
    for (const ev of existing) {
      await s.write(`data: ${JSON.stringify(ev)}\n\n`);
      lastSeq = ev.seq;
    }

    const isTerminal = (type: string) => type === "proposed" || type === "rejected" || type === "error";
    if (existing.some((e) => isTerminal(e.type))) return;

    let heartbeatAt = Date.now();
    while (true) {
      await sleep(500);
      const newEvs = getEventsAfter(nid, lastSeq);
      for (const ev of newEvs) {
        await s.write(`data: ${JSON.stringify(ev)}\n\n`);
        lastSeq = ev.seq;
      }
      if (Date.now() - heartbeatAt > 15_000) {
        await s.write(": heartbeat\n\n");
        heartbeatAt = Date.now();
      }
      if (newEvs.some((e) => isTerminal(e.type))) break;
    }
  });
});

// POST /negotiations/:nid/accept — buyer accepts (verifies escrow deposit)
negotiationRoutes.post("/negotiations/:nid/accept", requireAuth, async (c) => {
  const nid = c.req.param("nid");
  const address = c.get("address");

  const negotiation = getNegotiationById(nid);
  if (!negotiation) return c.json({ error: "Negotiation not found" }, 404);
  if (negotiation.status !== "proposed") {
    return c.json({ error: "Negotiation must be in proposed status" }, 409);
  }

  const instance = getInstanceById(negotiation.instance_id);
  if (!instance) return c.json({ error: "Instance not found" }, 404);
  if (instance.buyer_address !== address) {
    return c.json({ error: "Only the buyer can accept" }, 403);
  }

  // Verify escrow deposit on-chain
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const escrow = new ethers.Contract(config.escrowContract, ESCROW_ABI, provider);
    const bytes32Id = ethers.id(nid);
    const deposit = await escrow.deposits(bytes32Id);
    const depositAmount = Number(deposit.amount) / 1_000_000;

    if (depositAmount < (negotiation.asking_price ?? 0)) {
      return c.json({ error: "Deposit required before accepting" }, 400);
    }
    if (deposit.settled) {
      return c.json({ error: "Escrow already settled" }, 409);
    }
  } catch (err) {
    console.error("Escrow verification failed:", err);
    return c.json({ error: "Failed to verify escrow deposit" }, 500);
  }

  // Accept and sign
  const accepted = setAccepted(nid);
  if (!accepted) {
    return c.json({ error: "Failed to accept negotiation" }, 500);
  }

  try {
    const { signature, signerAddress } = await signOutcome(accepted, instance.buyer_address);
    setSignature(nid, signature, signerAddress, isTeeEnvironment());
  } catch (err) {
    console.error("TEE signing failed for", nid, ":", err);
  }

  const updated = getNegotiationById(nid)!;
  return c.json(toBuyerView(updated));
});

// POST /negotiations/:nid/cancel — buyer or seller cancels
negotiationRoutes.post("/negotiations/:nid/cancel", requireAuth, (c) => {
  const nid = c.req.param("nid");
  const address = c.get("address");

  const negotiation = getNegotiationById(nid);
  if (!negotiation) return c.json({ error: "Negotiation not found" }, 404);

  const instance = getInstanceById(negotiation.instance_id);
  if (!instance) return c.json({ error: "Instance not found" }, 404);

  if (instance.buyer_address !== address && negotiation.seller_address !== address) {
    return c.json({ error: "Only the buyer or seller can cancel" }, 403);
  }

  if (["accepted", "rejected", "cancelled", "failed"].includes(negotiation.status)) {
    return c.json({ error: "Negotiation is already terminal" }, 409);
  }

  const cancelled = setCancelled(nid);
  return c.json(toBuyerView(cancelled!));
});
