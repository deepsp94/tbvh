import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { HTTPException } from "hono/http-exception";
import { requireAuth, optionalAuth } from "../auth/middleware.js";
import {
  createInstance,
  getInstance,
  listInstances,
  listInstancesByAddress,
  commitInstance,
  startInstance,
  deleteInstance,
} from "../db/instances.js";
import { runNegotiation } from "../negotiation.js";
import type {
  CreateInstanceInput,
  CommitInstanceInput,
  Instance,
  PublicInstanceView,
  ParticipantInstanceView,
} from "../types.js";

export const instanceRoutes = new Hono();

// Helper: Convert instance to public view (for discovery)
function toPublicView(instance: Instance): PublicInstanceView {
  return {
    id: instance.id,
    status: instance.status,
    buyer_requirement: instance.buyer_requirement,
    max_payment: instance.max_payment,
    created_at: instance.created_at,
  };
}

// Helper: Convert instance to participant view
function toParticipantView(
  instance: Instance,
  viewerAddress: string
): ParticipantInstanceView {
  const view: ParticipantInstanceView = {
    id: instance.id,
    status: instance.status,
    buyer_requirement: instance.buyer_requirement,
    max_payment: instance.max_payment,
    created_at: instance.created_at,
    buyer_address: instance.buyer_address,
    seller_address: instance.seller_address,
    outcome: instance.outcome,
    final_price: instance.final_price,
    outcome_reasoning: instance.outcome_reasoning,
  };

  // CRITICAL: Only reveal seller_info to buyer on ACCEPT
  if (
    instance.outcome === "ACCEPT" &&
    viewerAddress === instance.buyer_address &&
    instance.seller_info
  ) {
    view.seller_info = instance.seller_info;
  }

  return view;
}

// List instances (public, for discovery)
instanceRoutes.get("/", optionalAuth, async (c) => {
  const status = c.req.query("status");
  const validStatuses = ["created", "committed", "running", "completed", "failed"];

  if (status && !validStatuses.includes(status)) {
    return c.json({ error: "Invalid status filter" }, 400);
  }

  const instances = listInstances(status as any);
  return c.json({ instances: instances.map(toPublicView) });
});

// List my instances
instanceRoutes.get("/mine", requireAuth, async (c) => {
  const address = c.get("address");
  const { asBuyer, asSeller } = listInstancesByAddress(address);

  return c.json({
    as_buyer: asBuyer.map((i) => toParticipantView(i, address)),
    as_seller: asSeller.map((i) => toParticipantView(i, address)),
  });
});

// Get instance details
instanceRoutes.get("/:id", optionalAuth, async (c) => {
  const id = c.req.param("id");
  const address = c.get("address");
  const instance = getInstance(id);

  if (!instance) {
    return c.json({ error: "Instance not found" }, 404);
  }

  // If viewer is a participant, return full view
  if (
    address &&
    (address === instance.buyer_address || address === instance.seller_address)
  ) {
    return c.json(toParticipantView(instance, address));
  }

  // Otherwise return public view
  return c.json(toPublicView(instance));
});

// Create instance (buyer)
instanceRoutes.post("/", requireAuth, async (c) => {
  const address = c.get("address");
  const body = await c.req.json<CreateInstanceInput>();

  if (!body.buyer_requirement || !body.max_payment) {
    return c.json(
      { error: "Missing required fields: buyer_requirement, max_payment" },
      400
    );
  }

  if (body.max_payment <= 0) {
    return c.json({ error: "max_payment must be positive" }, 400);
  }

  const instance = createInstance(body, address);
  return c.json({
    id: instance.id,
    status: instance.status,
    buyer_address: instance.buyer_address,
  });
});

// Seller commits to instance
instanceRoutes.post("/:id/commit", requireAuth, async (c) => {
  const id = c.req.param("id");
  const address = c.get("address");
  const body = await c.req.json<CommitInstanceInput>();

  if (!body.seller_info || !body.seller_proof) {
    return c.json(
      { error: "Missing required fields: seller_info, seller_proof" },
      400
    );
  }

  const instance = getInstance(id);
  if (!instance) {
    return c.json({ error: "Instance not found" }, 404);
  }

  if (instance.buyer_address === address) {
    return c.json({ error: "Cannot commit to your own instance" }, 403);
  }

  const updated = commitInstance(id, body, address);
  if (!updated) {
    return c.json({ error: "Instance not available for commitment" }, 400);
  }

  return c.json({ id: updated.id, status: updated.status });
});

// Start negotiation (buyer only)
instanceRoutes.post("/:id/run", requireAuth, async (c) => {
  const id = c.req.param("id");
  const address = c.get("address");

  const instance = getInstance(id);
  if (!instance) {
    return c.json({ error: "Instance not found" }, 404);
  }

  if (instance.buyer_address !== address) {
    return c.json({ error: "Only buyer can start negotiation" }, 403);
  }

  if (instance.status !== "committed") {
    return c.json({ error: "Instance must be in committed status" }, 400);
  }

  const updated = startInstance(id, address);
  if (!updated) {
    return c.json({ error: "Failed to start instance" }, 500);
  }

  return c.json({ id: updated.id, status: updated.status });
});

// Stream negotiation progress
instanceRoutes.get("/:id/stream", requireAuth, async (c) => {
  const id = c.req.param("id");
  const address = c.get("address");

  const instance = getInstance(id);
  if (!instance) {
    return c.json({ error: "Instance not found" }, 404);
  }

  // Only participants can stream
  if (
    instance.buyer_address !== address &&
    instance.seller_address !== address
  ) {
    return c.json({ error: "Not a participant" }, 403);
  }

  if (instance.status !== "running") {
    return c.json({ error: "Instance is not running" }, 400);
  }

  return streamSSE(c, async (stream) => {
    try {
      for await (const event of runNegotiation(instance)) {
        if (event.type === "progress") {
          await stream.writeSSE({
            event: "progress",
            data: JSON.stringify(event.data),
          });
        } else if (event.type === "complete") {
          await stream.writeSSE({
            event: "complete",
            data: JSON.stringify(event.data),
          });
        } else if (event.type === "error") {
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify(event.data),
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ message }),
      });
    }
  });
});

// Cancel instance (buyer only, before commitment)
instanceRoutes.delete("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const address = c.get("address");

  const deleted = deleteInstance(id, address);
  if (!deleted) {
    return c.json(
      { error: "Instance not found or cannot be deleted" },
      404
    );
  }

  return c.json({ deleted: true });
});
