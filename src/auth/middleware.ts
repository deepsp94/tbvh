import { createMiddleware } from "hono/factory";
import { verifyToken } from "./jwt.js";

export interface Variables {
  address: string;
}

export const requireAuth = createMiddleware<{ Variables: Variables }>(
  async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "Authorization required" }, 401);
    }
    const token = header.slice(7);
    try {
      const payload = await verifyToken(token);
      c.set("address", payload.sub);
      await next();
    } catch {
      return c.json({ error: "Invalid or expired token" }, 401);
    }
  }
);

export const optionalAuth = createMiddleware<{ Variables: Variables }>(
  async (c, next) => {
    const header = c.req.header("Authorization");
    if (header?.startsWith("Bearer ")) {
      const token = header.slice(7);
      try {
        const payload = await verifyToken(token);
        c.set("address", payload.sub);
      } catch {
        // invalid token — proceed unauthenticated
      }
    }
    await next();
  }
);
