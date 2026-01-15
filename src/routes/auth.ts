import { Hono } from "hono";
import { generateNonce } from "../auth/nonce.js";
import { verifySiweMessage } from "../auth/siwe.js";
import { createToken } from "../auth/jwt.js";

export const authRoutes = new Hono();

// Get nonce for SIWE
authRoutes.get("/nonce", async (c) => {
  const address = c.req.query("address");

  if (!address) {
    return c.json({ error: "Missing address parameter" }, 400);
  }

  // Basic address validation
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return c.json({ error: "Invalid Ethereum address format" }, 400);
  }

  const { nonce, expiresAt } = generateNonce(address);
  return c.json({ nonce, expiresAt });
});

// Verify SIWE signature and issue JWT
authRoutes.post("/verify", async (c) => {
  const body = await c.req.json<{ message: string; signature: string }>();

  if (!body.message || !body.signature) {
    return c.json({ error: "Missing message or signature" }, 400);
  }

  const result = await verifySiweMessage(body.message, body.signature);

  if (!result.success) {
    return c.json({ error: result.error }, 401);
  }

  const { token, expiresAt } = await createToken(result.address!);
  return c.json({ token, address: result.address, expiresAt });
});
