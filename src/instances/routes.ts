import { Hono } from "hono";
import {
  createInstance,
  getInstanceById,
  deleteInstance,
  getInstancesByBuyer,
  listInstances,
  closeInstance,
} from "../db/instances.js";
import { getNegotiationsBySeller } from "../db/negotiations.js";
import { requireAuth, optionalAuth, type Variables } from "../auth/middleware.js";
import type {
  Instance,
  CreateInstanceInput,
  PublicInstanceView,
} from "@shared/types.js";

export const instanceRoutes = new Hono<{ Variables: Variables }>();

function toPublicView(instance: Instance): PublicInstanceView {
  return {
    id: instance.id,
    status: instance.status,
    buyer_address: instance.buyer_address,
    buyer_requirement_title: instance.buyer_requirement_title,
    buyer_requirement: instance.buyer_requirement,
    max_payment: instance.max_payment,
    created_at: instance.created_at,
  };
}

// GET /mine — must be before GET /:id
instanceRoutes.get("/mine", requireAuth, (c) => {
  const address = c.get("address");
  const asBuyer = getInstancesByBuyer(address).map(toPublicView);
  const sellerNegs = getNegotiationsBySeller(address);
  const asSeller = sellerNegs.map((n) => {
    const inst = getInstanceById(n.instance_id);
    return {
      ...n,
      buyer_requirement_title: inst?.buyer_requirement_title ?? "",
      buyer_requirement: inst?.buyer_requirement ?? "",
      max_payment: inst?.max_payment ?? 0,
    };
  });
  return c.json({ as_buyer: asBuyer, as_seller: asSeller });
});

instanceRoutes.post("/", requireAuth, async (c) => {
  const address = c.get("address");
  const body = await c.req.json<CreateInstanceInput>();

  if (!body.buyer_requirement_title || typeof body.buyer_requirement_title !== "string") {
    return c.json({ error: "buyer_requirement_title is required" }, 400);
  }
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
  const rows = listInstances(status);
  return c.json(rows.map(toPublicView));
});

instanceRoutes.post("/:id/close", requireAuth, (c) => {
  const id = c.req.param("id");
  const address = c.get("address");

  const instance = getInstanceById(id);
  if (!instance) return c.json({ error: "Instance not found" }, 404);
  if (instance.buyer_address !== address) {
    return c.json({ error: "Only the buyer can close" }, 403);
  }
  if (instance.status !== "open") {
    return c.json({ error: "Instance is not open" }, 409);
  }

  const updated = closeInstance(id);
  return c.json(toPublicView(updated!));
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
    return c.json({ error: "Only the buyer can delete" }, 403);
  }
  if (instance.status !== "open") {
    return c.json({ error: "Can only delete open instances" }, 409);
  }

  deleteInstance(id);
  return new Response(null, { status: 204 });
});
