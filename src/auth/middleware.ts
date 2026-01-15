import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verifyToken } from "./jwt.js";

// Extends Hono context with address
declare module "hono" {
  interface ContextVariableMap {
    address: string;
  }
}

// Require authentication - throws 401 if not authenticated
export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token);

  if (!payload) {
    throw new HTTPException(401, { message: "Invalid or expired token" });
  }

  c.set("address", payload.sub);
  await next();
});

// Optional authentication - sets address if valid token provided, continues either way
export const optionalAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (payload) {
      c.set("address", payload.sub);
    }
  }

  await next();
});
