import { Hono } from "hono";
import { getDb } from "../db/index.js";
import { createInstance, getInstanceById } from "../db/instances.js";
import { requireAuth, optionalAuth, type Variables } from "../auth/middleware.js";
import type { Instance, CreateInstanceInput } from "@shared/types.js";

export const instanceRoutes = new Hono<{ Variables: Variables }>();

function toPublicView(instance: Instance) {
  return {
    id: instance.id,
    status: instance.status,
    buyer_requirement: instance.buyer_requirement,
    max_payment: instance.max_payment,
    created_at: instance.created_at,
  };
}

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

instanceRoutes.get("/:id", optionalAuth, (c) => {
  const id = c.req.param("id");
  const instance = getInstanceById(id);
  if (!instance) {
    return c.json({ error: "Instance not found" }, 404);
  }
  return c.json(toPublicView(instance));
});
