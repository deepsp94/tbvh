import { Hono } from "hono";
import { stream } from "hono/streaming";
import { getDb } from "../db/index.js";
import {
  createInstance,
  getInstanceById,
  commitInstance,
  deleteInstance,
  getInstancesByBuyer,
  getInstancesBySeller,
  setRunning,
} from "../db/instances.js";
import { getEvents, getEventsAfter } from "../db/events.js";
import { requireAuth, optionalAuth, type Variables } from "../auth/middleware.js";
import { verifyToken } from "../auth/jwt.js";
import { runNegotiation } from "../negotiation.js";
import type {
  Instance,
  CreateInstanceInput,
  CommitInstanceInput,
  PublicInstanceView,
  ParticipantInstanceView,
} from "@shared/types.js";

export const instanceRoutes = new Hono<{ Variables: Variables }>();

function toPublicView(instance: Instance): PublicInstanceView {
  return {
    id: instance.id,
    status: instance.status,
    buyer_address: instance.buyer_address,
    buyer_requirement: instance.buyer_requirement,
    max_payment: instance.max_payment,
    seller_address: instance.seller_address,
    committed_at: instance.committed_at,
    created_at: instance.created_at,
    outcome: instance.outcome,
    final_price: instance.final_price,
    outcome_reasoning: instance.outcome_reasoning,
  };
}

function toParticipantView(instance: Instance): ParticipantInstanceView {
  return {
    id: instance.id,
    status: instance.status,
    buyer_address: instance.buyer_address,
    buyer_requirement: instance.buyer_requirement,
    max_payment: instance.max_payment,
    seller_address: instance.seller_address,
    seller_info: instance.seller_info,
    committed_at: instance.committed_at,
    started_at: instance.started_at,
    completed_at: instance.completed_at,
    outcome: instance.outcome,
    final_price: instance.final_price,
    outcome_reasoning: instance.outcome_reasoning,
    created_at: instance.created_at,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// GET /mine — must be before GET /:id
instanceRoutes.get("/mine", requireAuth, (c) => {
  const address = c.get("address");
  const asBuyer = getInstancesByBuyer(address).map(toParticipantView);
  const asSeller = getInstancesBySeller(address).map(toParticipantView);
  return c.json({ as_buyer: asBuyer, as_seller: asSeller });
});

instanceRoutes.post("/", requireAuth, async (c) => {
  const address = c.get("address");
  const body = await c.req.json<CreateInstanceInput>();

  if (!body.buyer_requirement || typeof body.buyer_requirement !== "string") {
    return c.json({ error: "buyer_requirement is required" }, 400);
  }
  if (typeof body.max_payment !== "number" || body.max_payment <= 0) {
    return c.json({ error: "max_payment must be a positive number" }, 400);
  }

  const instance = createInstance(body, address);
  return c.json(instance, 201);
});

instanceRoutes.get("/", optionalAuth, (c) => {
  const status = c.req.query("status");
  const db = getDb();

  const rows = status
    ? (db
        .prepare("SELECT * FROM instances WHERE status = ? ORDER BY created_at DESC")
        .all(status) as Instance[])
    : (db
        .prepare("SELECT * FROM instances ORDER BY created_at DESC")
        .all() as Instance[]);

  return c.json(rows.map(toPublicView));
});

instanceRoutes.post("/:id/commit", requireAuth, async (c) => {
  const id = c.req.param("id");
  const address = c.get("address");

  const instance = getInstanceById(id);
  if (!instance) return c.json({ error: "Instance not found" }, 404);
  if (instance.status !== "created") {
    return c.json({ error: "Instance is not open for commitment" }, 409);
  }
  if (instance.buyer_address === address) {
    return c.json({ error: "Buyer cannot commit as seller" }, 403);
  }

  const body = await c.req.json<CommitInstanceInput>();
  if (!body.seller_info || typeof body.seller_info !== "string") {
    return c.json({ error: "seller_info is required" }, 400);
  }
  if (!body.seller_proof || typeof body.seller_proof !== "string") {
    return c.json({ error: "seller_proof is required" }, 400);
  }

  const updated = commitInstance(id, address, body);
  return c.json(toPublicView(updated!));
});

instanceRoutes.post("/:id/run", requireAuth, async (c) => {
  const id = c.req.param("id");
  const address = c.get("address");

  const instance = getInstanceById(id);
  if (!instance) return c.json({ error: "Instance not found" }, 404);
  if (instance.buyer_address !== address) {
    return c.json({ error: "Only the buyer can start negotiation" }, 403);
  }

  const result = setRunning(id);
  if (!result.success) {
    return c.json({ error: "Instance must be committed before running" }, 409);
  }

  runNegotiation(result.instance!).catch((err) =>
    console.error("Negotiation failed for instance", id, ":", err)
  );

  return c.json({ message: "Negotiation started" }, 202);
});

instanceRoutes.get("/:id/stream", async (c) => {
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

  if (instance.buyer_address !== address && instance.seller_address !== address) {
    return c.json({ error: "Forbidden" }, 403);
  }

  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");
  c.header("X-Accel-Buffering", "no");

  return stream(c, async (s) => {
    let lastSeq = 0;
    const existing = getEvents(id);
    for (const ev of existing) {
      await s.write(`data: ${JSON.stringify(ev)}\n\n`);
      lastSeq = ev.seq;
    }

    const isTerminal = (type: string) => type === "outcome" || type === "error";
    if (existing.some((e) => isTerminal(e.type))) return;

    let heartbeatAt = Date.now();
    while (true) {
      await sleep(500);
      const newEvs = getEventsAfter(id, lastSeq);
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

instanceRoutes.get("/:id", optionalAuth, (c) => {
  const id = c.req.param("id");
  const instance = getInstanceById(id);
  if (!instance) {
    return c.json({ error: "Instance not found" }, 404);
  }
  return c.json(toPublicView(instance));
});

instanceRoutes.delete("/:id", requireAuth, (c) => {
  const id = c.req.param("id");
  const address = c.get("address");

  const instance = getInstanceById(id);
  if (!instance) return c.json({ error: "Instance not found" }, 404);
  if (instance.buyer_address !== address) {
    return c.json({ error: "Only the buyer can cancel" }, 403);
  }
  if (instance.status !== "created") {
    return c.json({ error: "Can only cancel before commitment" }, 409);
  }

  deleteInstance(id);
  return new Response(null, { status: 204 });
});
